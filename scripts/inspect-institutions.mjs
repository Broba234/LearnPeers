import fs from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';

// load DATABASE_URL from .env.local
const env = fs.readFileSync(path.resolve('.env.local'), 'utf8');
const line = env.split('\n').find((l) => l.startsWith('DATABASE_URL='));
const url = line.replace('DATABASE_URL=', '').trim().replace(/^"|"$/g, '');

const client = new Client({ connectionString: url });

async function q(sql, params) {
  const r = await client.query(sql, params);
  return r.rows;
}

const main = async () => {
  await client.connect();

  console.log('=== PROVINCES ===');
  console.table(await q('SELECT code, name, country, is_territory FROM "Provinces" ORDER BY name'));

  console.log('\n=== INSTITUTION COUNT BY TYPE ===');
  console.table(await q('SELECT type, count(*)::int FROM "Institutions" GROUP BY type ORDER BY type'));

  console.log('\n=== INSTITUTION COUNT BY PROVINCE + TYPE ===');
  console.table(
    await q(
      `SELECT COALESCE(p.code, i.province, '(none)') AS province, i.type, count(*)::int
       FROM "Institutions" i
       LEFT JOIN "Provinces" p ON p.id = i.province_id
       GROUP BY 1, 2 ORDER BY 1, 2`
    )
  );

  console.log('\n=== ALL ONTARIO INSTITUTIONS ===');
  const ont = await q(
    `SELECT i.name, i.abbreviation, i.type, i.city, i.website, i.email_domains, i.province
     FROM "Institutions" i
     LEFT JOIN "Provinces" p ON p.id = i.province_id
     WHERE p.code = 'ON' OR i.province ILIKE 'ontario' OR i.province = 'ON'
     ORDER BY i.type, i.name`
  );
  console.log(`(${ont.length} rows)`);
  console.table(ont);

  console.log('\n=== ALL INSTITUTIONS (full list, name/type/province/city) ===');
  const all = await q(
    `SELECT i.name, i.type, COALESCE(p.code, i.province) AS prov, i.city
     FROM "Institutions" i LEFT JOIN "Provinces" p ON p.id = i.province_id
     ORDER BY 3, type, name`
  );
  console.log(`TOTAL INSTITUTIONS: ${all.length}`);
  console.table(all);

  console.log('\n=== COURSES (InstitutionCourses) COUNT BY INSTITUTION ===');
  console.table(
    await q(
      `SELECT i.name, count(*)::int AS courses
       FROM "InstitutionCourses" ic JOIN "Institutions" i ON i.id = ic.institution_id
       GROUP BY i.name ORDER BY 2 DESC LIMIT 50`
    )
  );
  const cc = await q('SELECT count(*)::int AS n FROM "InstitutionCourses"');
  console.log('TOTAL InstitutionCourses:', cc[0].n);

  console.log('\n=== SUBJECTS COUNT ===');
  const sc = await q('SELECT count(*)::int AS n FROM "Subjects"');
  console.log('TOTAL Subjects:', sc[0].n);
  console.table(await q('SELECT category, count(*)::int FROM "Subjects" GROUP BY category ORDER BY 2 DESC'));

  console.log('\n=== CURRICULA ===');
  console.table(await q('SELECT name, kind FROM "Curricula" ORDER BY kind, name'));

  await client.end();
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
