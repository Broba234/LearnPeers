import fs from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';

const env = fs.readFileSync(path.resolve('.env.local'), 'utf8');
const url = env.split('\n').find((l) => l.startsWith('DATABASE_URL='))
  .replace('DATABASE_URL=', '').trim().replace(/^"|"$/g, '');
const client = new Client({ connectionString: url });

const TUTOR_EMAIL = 'edouard.taha@icloud.com';
const STUDENT_EMAIL = 'edouard.taha@gmail.com';

async function main() {
  await client.connect();

  const profiles = await client.query(
    `SELECT id, email, name, role, avatar, bio, education, rating, institution_id,
            "isAvailableNow", profile_setup
       FROM public."Profiles"
      WHERE email = ANY($1)`,
    [[TUTOR_EMAIL, STUDENT_EMAIL]]
  );
  console.log('=== PROFILES ===');
  for (const p of profiles.rows) console.log(JSON.stringify(p, null, 2));

  const tutor = profiles.rows.find((p) => p.email === TUTOR_EMAIL);
  const student = profiles.rows.find((p) => p.email === STUDENT_EMAIL);

  if (tutor) {
    console.log('\n=== TUTOR institution ===');
    const inst = await client.query(`SELECT id, name, abbreviation, type, city FROM public."Institutions" WHERE id = $1`, [tutor.institution_id]);
    console.log(inst.rows);

    console.log('\n=== TUTOR ProfileInstitutions (school verification) ===');
    const pi = await client.query(
      `SELECT pi.id, pi.kind, pi.status, pi.verification_method, pi.verified_email, pi.institution_name_raw, i.name AS inst_name
         FROM public."ProfileInstitutions" pi
         LEFT JOIN public."Institutions" i ON i.id = pi.institution_id
        WHERE pi.profile_id = $1`, [tutor.id]);
    console.log(pi.rows);

    console.log('\n=== TUTOR CourseAssets ===');
    const ca = await client.query(
      `SELECT ca.id, ca.status, ca.grade_value, ca.grade_scale, ca.verified_at, ca.verification_method,
              ca.rating, ca.rating_count, ca.xp, ca.tier, ca.sessions_count, ca.total_earnings,
              ca.price_1, ca.price_2, ca.price_3,
              s.name AS subject_name, s.code AS subject_code, ic.code AS course_code, ic.name AS course_name
         FROM public."CourseAssets" ca
         LEFT JOIN public."Subjects" s ON s.id = ca.subject_id
         LEFT JOIN public."InstitutionCourses" ic ON ic.id = ca.institution_course_id
        WHERE ca.tutor_id = $1
        ORDER BY ca.updated_at DESC`, [tutor.id]);
    console.log(ca.rows);

    console.log('\n=== TUTOR ProfilesOnSubjects (live listings) ===');
    const pos = await client.query(
      `SELECT pos.subject_id, pos.institution_course_id, pos.price_1, pos.price_2, pos.price_3,
              s.name AS subject_name, ic.code AS course_code
         FROM public."ProfilesOnSubjects" pos
         LEFT JOIN public."Subjects" s ON s.id = pos.subject_id
         LEFT JOIN public."InstitutionCourses" ic ON ic.id = pos.institution_course_id
        WHERE pos.profile_id = $1`, [tutor.id]);
    console.log(pos.rows);

    console.log('\n=== TUTOR CourseReviews ===');
    const cr = await client.query(`SELECT id, rating, comment, created_at FROM public."CourseReviews" WHERE tutor_id = $1`, [tutor.id]);
    console.log(cr.rows);
  }

  if (tutor && student) {
    console.log('\n=== SESSIONS between them ===');
    const sess = await client.query(
      `SELECT id, status, topic, duration, amount, created_at, is_instant
         FROM public."Sessions"
        WHERE (tutor_id = $1 AND student_id = $2) OR (tutor_id = $2 AND student_id = $1)
        ORDER BY created_at DESC`, [tutor.id, student.id]);
    console.log(`count: ${sess.rows.length}`);
    console.log(sess.rows);
  }

  // How many tutors total / live / with verified assets — to gauge marketplace density
  console.log('\n=== MARKETPLACE DENSITY ===');
  const counts = await client.query(`
    SELECT
      (SELECT count(*) FROM public."Profiles" WHERE role='tutor') AS tutors,
      (SELECT count(*) FROM public."Profiles" WHERE role='student') AS students,
      (SELECT count(*) FROM public."ProfilesOnSubjects") AS listings,
      (SELECT count(*) FROM public."CourseAssets" WHERE status='live') AS live_assets,
      (SELECT count(*) FROM public."CourseAssets" WHERE status='verified') AS verified_assets,
      (SELECT count(*) FROM public."Sessions") AS sessions,
      (SELECT count(*) FROM public."Institutions" WHERE type='university') AS universities
  `);
  console.log(counts.rows[0]);

  await client.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
