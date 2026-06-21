import fs from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';

const env = fs.readFileSync(path.resolve('.env.local'), 'utf8');
const url = env.split('\n').find((l) => l.startsWith('DATABASE_URL='))
  .replace('DATABASE_URL=', '').trim().replace(/^"|"$/g, '');
const client = new Client({ connectionString: url });

// 10 missing publicly-assisted Ontario universities (RMC intentionally excluded).
const UNIVERSITIES = [
  ['Algoma University', 'Algoma', 'Sault Ste. Marie', 'https://algomau.ca', ['algomau.ca']],
  ['Lakehead University', 'Lakehead', 'Thunder Bay', 'https://www.lakeheadu.ca', ['lakeheadu.ca']],
  ['Laurentian University', 'Laurentian', 'Sudbury', 'https://laurentian.ca', ['laurentian.ca']],
  ['Nipissing University', 'Nipissing', 'North Bay', 'https://www.nipissingu.ca', ['nipissingu.ca']],
  ['OCAD University', 'OCAD', 'Toronto', 'https://www.ocadu.ca', ['ocadu.ca', 'student.ocadu.ca']],
  ['Ontario Tech University', 'Ontario Tech', 'Oshawa', 'https://ontariotechu.ca', ['ontariotechu.ca', 'ontariotechu.net']],
  ['Trent University', 'Trent', 'Peterborough', 'https://www.trentu.ca', ['trentu.ca']],
  ['Université de Hearst', 'Hearst', 'Hearst', 'https://www.uhearst.ca', ['uhearst.ca']],
  ["Université de l'Ontario français", 'UOF', 'Toronto', 'https://www.uontario.ca', ['uontario.ca']],
  ['University of Windsor', 'Windsor', 'Windsor', 'https://www.uwindsor.ca', ['uwindsor.ca']],
];

const q = (sql, params) => client.query(sql, params);

async function main() {
  await client.connect();
  await q('BEGIN');
  try {
    // ---- schema change ----
    await q(fs.readFileSync(path.resolve('prisma/sql/2026-06-16_institution_board_external_id.sql'), 'utf8'));

    const on = (await q(`SELECT id FROM "Provinces" WHERE code='ON'`)).rows[0].id;

    // ---- universities (idempotent by name) ----
    let uniAdded = 0;
    for (const [name, abbr, city, site, domains] of UNIVERSITIES) {
      const r = await q(
        `INSERT INTO "Institutions" (name, abbreviation, type, country, province, province_id, city, website, email_domains)
         SELECT $1,$2,'university','Canada','Ontario',$3,$4,$5,$6
         WHERE NOT EXISTS (SELECT 1 FROM "Institutions" WHERE name=$1)
         RETURNING id`,
        [name, abbr, on, city, site, domains]
      );
      uniAdded += r.rowCount;
    }
    console.log(`universities inserted: ${uniAdded}`);

    const data = JSON.parse(fs.readFileSync(path.resolve('data/ontario_institutions_build.json'), 'utf8'));

    // ---- reconcile existing boards: give them their Ministry Board Number ----
    for (const b of data.boards) {
      await q(
        `UPDATE "Institutions" SET external_id=$1
         WHERE name=$2 AND type='school_board' AND external_id IS NULL`,
        [b.external_id, b.name]
      );
    }

    // ---- upsert all boards by external_id ----
    for (const b of data.boards) {
      await q(
        `INSERT INTO "Institutions" (name, abbreviation, type, country, province, province_id, city, website, external_id)
         VALUES ($1,$2,'school_board','Canada','Ontario',$3,$4,$5,$6)
         ON CONFLICT (external_id) DO UPDATE SET
           abbreviation = COALESCE("Institutions".abbreviation, EXCLUDED.abbreviation),
           website      = COALESCE("Institutions".website, EXCLUDED.website),
           city         = COALESCE("Institutions".city, EXCLUDED.city),
           province_id  = EXCLUDED.province_id,
           updated_at   = now()`,
        [b.name, b.abbreviation, on, b.city, b.website, b.external_id]
      );
    }
    const boardCount = (await q(`SELECT count(*)::int n FROM "Institutions" WHERE type='school_board'`)).rows[0].n;
    console.log(`school boards now: ${boardCount}`);

    // map board external_id -> uuid
    const bmap = new Map(
      (await q(`SELECT id, external_id FROM "Institutions" WHERE type='school_board' AND external_id IS NOT NULL`))
        .rows.map((r) => [r.external_id, r.id])
    );

    // ---- upsert high schools (batched) ----
    const hs = data.high_schools;
    const chunk = 100;
    for (let i = 0; i < hs.length; i += chunk) {
      const slice = hs.slice(i, i + chunk);
      const vals = [];
      for (const h of slice) {
        const domains = h.email_domain ? [h.email_domain] : [];
        vals.push(h.name, on, h.city, h.website, domains, bmap.get(h.board_external_id) || null, h.external_id);
      }
      // column order per row: name, province_id, city, website, email_domains, board_id, external_id
      await q(
        `INSERT INTO "Institutions" (name, country, province, type, province_id, city, website, email_domains, board_id, external_id)
         SELECT v.name, 'Canada','Ontario','high_school', v.province_id, v.city, v.website, v.email_domains, v.board_id, v.external_id
         FROM (VALUES ${slice.map((_, j) =>
           `($${j * 7 + 1}, $${j * 7 + 2}::uuid, $${j * 7 + 3}, $${j * 7 + 4}, $${j * 7 + 5}::text[], $${j * 7 + 6}::uuid, $${j * 7 + 7})`
         ).join(',')}) AS v(name, province_id, city, website, email_domains, board_id, external_id)
         ON CONFLICT (external_id) DO UPDATE SET
           name=EXCLUDED.name, city=EXCLUDED.city, website=EXCLUDED.website,
           email_domains=EXCLUDED.email_domains, board_id=EXCLUDED.board_id,
           province_id=EXCLUDED.province_id, updated_at=now()`,
        vals
      );
    }
    const hsCount = (await q(`SELECT count(*)::int n FROM "Institutions" WHERE type='high_school'`)).rows[0].n;
    const linked = (await q(`SELECT count(*)::int n FROM "Institutions" WHERE type='high_school' AND board_id IS NOT NULL`)).rows[0].n;
    console.log(`high schools now: ${hsCount} (linked to a board: ${linked})`);

    await q('COMMIT');
    console.log('COMMIT ok');
  } catch (e) {
    await q('ROLLBACK');
    throw e;
  } finally {
    await client.end();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
