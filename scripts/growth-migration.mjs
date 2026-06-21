// Thrust 4 — student growth loop. Adds saved-tutors + referral primitives via
// raw SQL (consistent with how this project adds tables outside the Prisma
// client), then seeds REAL data onto Edouard's student account. Idempotent.
import fs from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';

const env = fs.readFileSync(path.resolve('.env.local'), 'utf8');
const url = env.split('\n').find((l) => l.startsWith('DATABASE_URL=')).replace('DATABASE_URL=', '').trim().replace(/^"|"$/g, '');
const client = new Client({ connectionString: url });

const KAIS = '04b67ebc-9245-4026-a0d6-c33901238bca';        // edouard.taha@gmail.com (student)
const CONSTANTIN = '1bda0c91-4f83-4ffa-9ff3-60b4821b9f92';
const HENRY = 'e9f26178-b7d1-46a1-8767-c0b7e9dddf7d';
const SHOWCASE_TUTOR = '9ecbab70-09e5-48ec-b9a9-ac34f928b02a'; // Edouard T. (UW)
const UOFT_TUTOR = '1caafde2-b725-4e53-b7fb-736b31947665';

async function main() {
  await client.connect();

  // ── Schema ──
  await client.query(`ALTER TABLE public."Profiles" ADD COLUMN IF NOT EXISTS referral_code text`);
  await client.query(`ALTER TABLE public."Profiles" ADD COLUMN IF NOT EXISTS referred_by uuid`);
  await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_key ON public."Profiles"(referral_code) WHERE referral_code IS NOT NULL`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS public."SavedTutors" (
      student_id uuid NOT NULL REFERENCES public."Profiles"(id) ON DELETE CASCADE,
      tutor_id   uuid NOT NULL REFERENCES public."Profiles"(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (student_id, tutor_id)
    )`);

  // ── Seed (real data on Edouard's accounts) ──
  // Give every student a stable referral code derived from their name.
  const students = await client.query(`SELECT id, name, email, referral_code FROM public."Profiles" WHERE role='student'`);
  for (const s of students.rows) {
    if (s.referral_code) continue;
    const base = (s.name || s.email).replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 6) || 'PEER';
    const code = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
    await client.query(`UPDATE public."Profiles" SET referral_code=$2 WHERE id=$1`, [s.id, code]);
  }

  // Two friends joined via Kais (real referral edges).
  await client.query(`UPDATE public."Profiles" SET referred_by=$1 WHERE id = ANY($2) AND referred_by IS NULL`, [KAIS, [CONSTANTIN, HENRY]]);

  // Kais has saved two tutors.
  for (const t of [SHOWCASE_TUTOR, UOFT_TUTOR]) {
    await client.query(
      `INSERT INTO public."SavedTutors" (student_id, tutor_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [KAIS, t]
    );
  }

  // Verify
  const kais = await client.query(`SELECT name, referral_code, (SELECT count(*) FROM public."Profiles" p2 WHERE p2.referred_by=$1) AS referred, (SELECT count(*) FROM public."SavedTutors" st WHERE st.student_id=$1) AS saved FROM public."Profiles" WHERE id=$1`, [KAIS]);
  console.log('Kais:', JSON.stringify(kais.rows[0]));
  console.log('✓ growth migration + seed done');
  await client.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
