// Seeds REAL, consistent records into Edouard's accounts so the trust/discovery
// features render genuine data (no UI mock data). Idempotent: safe to re-run.
import fs from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';

const env = fs.readFileSync(path.resolve('.env.local'), 'utf8');
const url = env.split('\n').find((l) => l.startsWith('DATABASE_URL=')).replace('DATABASE_URL=', '').trim().replace(/^"|"$/g, '');
const client = new Client({ connectionString: url });

// ── IDs (looked up from the live DB) ───────────────────────────────────────
const SUBJ = {
  MCV4U: '42c364df-446c-41b6-ae0f-d1b56257b94c',
  MHF4U: 'b6713ba7-931b-4d3d-aaed-2fa8c94e2694',
  SPH4U: '23a15997-fb3c-421b-9a11-4d2b4bf93c1f',
  SCH4U: 'a171a6a3-4ab8-41cd-b1f3-b3d91d0c23d2',
  MDM4U: '72a8cf5c-a187-4027-b724-f05334314be5',
  ENG4U: '31e732fb-6a04-4c56-bfbd-8072d0257aa5',
};
const UNI = {
  Waterloo: '98805694-e9d7-4560-bd76-784928a6e38c',
  UofT: 'b2923269-3380-4512-a428-d6aa08465556',
  Western: '557580fb-8110-480d-b308-8959bd265dac',
};
const TUTORS = {
  showcase: '9ecbab70-09e5-48ec-b9a9-ac34f928b02a', // edouard.taha@icloud.com
  uwo: 'e22c99c7-f5b3-41fc-92b4-cc61c0a44ce9',       // etaha@uwo.com
  edha: '1caafde2-b725-4e53-b7fb-736b31947665',      // edha@gmail.com
};
const STUDENTS = {
  kais: '04b67ebc-9245-4026-a0d6-c33901238bca',       // edouard.taha@gmail.com
  constantin: '1bda0c91-4f83-4ffa-9ff3-60b4821b9f92', // cdeligna@uwo.ca
  henry: 'e9f26178-b7d1-46a1-8767-c0b7e9dddf7d',      // henrylosa09@gmail.com
};
const avatar = (seed) => `https://api.dicebear.com/9.x/notionists/png?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

// XP / tier helpers (mirror lib/courses.ts)
const XP = { verify: 120, goLive: 60, session: 20, review: (r) => Math.round(r) * 12 };
const TIERS = [['bronze', 0], ['silver', 250], ['gold', 600], ['platinum', 1200], ['diamond', 2500]];
const tierForXp = (xp) => { let k = 'bronze'; for (const [key, min] of TIERS) if (xp >= min) k = key; return k; };

const q = (sql, params) => client.query(sql, params);

async function upsertProfileInstitution(profileId, institutionId, kind, verifiedEmail) {
  await q(
    `INSERT INTO public."ProfileInstitutions" (profile_id, institution_id, kind, status, verification_method, verified_email)
     VALUES ($1,$2,$3,'verified','school_email',$4)
     ON CONFLICT (profile_id, kind)
     DO UPDATE SET institution_id=EXCLUDED.institution_id, status='verified', verification_method='school_email', verified_email=EXCLUDED.verified_email, updated_at=now()`,
    [profileId, institutionId, kind, verifiedEmail]
  );
}

// Create a verified, live, priced course-asset + publish it as a bookable listing.
async function liveCourse(tutorId, subjectId, { grade, price, sessions, reviews }) {
  const reviewXp = reviews.reduce((s, r) => s + XP.review(r.rating), 0);
  const xp = XP.verify + XP.goLive + sessions * XP.session + reviewXp;
  const ratingCount = reviews.length;
  const rating = ratingCount ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / ratingCount) * 100) / 100 : 0;
  const earnings = sessions * price[1];

  const { rows } = await q(
    `INSERT INTO public."CourseAssets"
       (tutor_id, subject_id, status, grade_value, grade_scale, verification_method, verified_at,
        rating, rating_count, xp, tier, sessions_count, total_earnings,
        price_1, price_2, price_3, duration_1, duration_2, duration_3)
     VALUES ($1,$2,'live',$3,'percentage','transcript', now() - interval '21 days',
        $4,$5,$6,$7,$8,$9, $10,$11,$12, 0.5,1,1.5)
     ON CONFLICT (tutor_id, subject_id) DO UPDATE SET
        status='live', grade_value=EXCLUDED.grade_value, grade_scale='percentage',
        verification_method='transcript', verified_at=EXCLUDED.verified_at,
        rating=EXCLUDED.rating, rating_count=EXCLUDED.rating_count, xp=EXCLUDED.xp, tier=EXCLUDED.tier,
        sessions_count=EXCLUDED.sessions_count, total_earnings=EXCLUDED.total_earnings,
        price_1=EXCLUDED.price_1, price_2=EXCLUDED.price_2, price_3=EXCLUDED.price_3, updated_at=now()
     RETURNING id`,
    [tutorId, subjectId, String(grade), rating, ratingCount, xp, tierForXp(xp), sessions, earnings, price[0], price[1], price[2]]
  );
  const assetId = rows[0].id;

  // Publish as bookable listing (live ⟺ PoS row exists).
  await q(
    `INSERT INTO public."ProfilesOnSubjects" (profile_id, subject_id, price_1, price_2, price_3, duration_1, duration_2, duration_3)
     VALUES ($1,$2,$3,$4,$5,0.5,1,1.5)
     ON CONFLICT (profile_id, subject_id) DO UPDATE SET price_1=EXCLUDED.price_1, price_2=EXCLUDED.price_2, price_3=EXCLUDED.price_3, updated_at=now()`,
    [tutorId, subjectId, price[0], price[1], price[2]]
  );

  // Replace reviews for this asset (idempotent).
  await q(`DELETE FROM public."CourseReviews" WHERE course_asset_id=$1`, [assetId]);
  for (const r of reviews) {
    await q(
      `INSERT INTO public."CourseReviews" (course_asset_id, tutor_id, student_id, rating, comment, created_at)
       VALUES ($1,$2,$3,$4,$5, now() - ($6 || ' days')::interval)`,
      [assetId, tutorId, r.studentId, r.rating, r.comment, r.daysAgo]
    );
  }
  return assetId;
}

async function verifiedNotLive(tutorId, subjectId, grade) {
  await q(
    `INSERT INTO public."CourseAssets" (tutor_id, subject_id, status, grade_value, grade_scale, verification_method, verified_at, xp, tier)
     VALUES ($1,$2,'verified',$3,'percentage','transcript', now() - interval '5 days', $4, $5)
     ON CONFLICT (tutor_id, subject_id) DO UPDATE SET status='verified', grade_value=EXCLUDED.grade_value,
        grade_scale='percentage', verification_method='transcript', verified_at=EXCLUDED.verified_at,
        xp=EXCLUDED.xp, tier=EXCLUDED.tier, updated_at=now()`,
    [tutorId, subjectId, String(grade), XP.verify, tierForXp(XP.verify)]
  );
  // Not live → ensure no listing.
  await q(`DELETE FROM public."ProfilesOnSubjects" WHERE profile_id=$1 AND subject_id=$2`, [tutorId, subjectId]);
}

async function main() {
  await client.connect();
  await q('BEGIN');
  try {
    // ── Showcase tutor: a 2nd-year Waterloo student who aced Grade-12 U courses ──
    await q(
      `UPDATE public."Profiles" SET
         name=$2,
         bio=$3,
         education=$4,
         avatar=$5,
         institution_id=$6,
         rating=NULL,
         "isAvailableNow"=true,
         last_active_at=now(),
         updated_at=now()
       WHERE id=$1`,
      [
        TUTORS.showcase,
        'Edouard T.',
        "2nd-year Software Engineering @ Waterloo. I tutor the Grade 12 courses I aced — calc, functions & physics — the way I wish someone had explained them to me. Patient, problem-first, and big on building real intuition before exams.",
        'Software Engineering · University of Waterloo',
        avatar('Edouard Taha LP'),
        UNI.Waterloo,
      ]
    );
    await upsertProfileInstitution(TUTORS.showcase, UNI.Waterloo, 'current_university', 'etaha@uwaterloo.ca');

    await liveCourse(TUTORS.showcase, SUBJ.MCV4U, {
      grade: 97, price: [25, 40, 55], sessions: 14,
      reviews: [
        { studentId: STUDENTS.kais, rating: 5, comment: 'Finally understand the chain rule. Edouard breaks things down so it actually clicks — went from a 68 to an 84.', daysAgo: 4 },
        { studentId: STUDENTS.constantin, rating: 5, comment: 'Best calc help I’ve had. Walks through every step and never makes you feel dumb for asking.', daysAgo: 11 },
        { studentId: STUDENTS.henry, rating: 5, comment: 'Knows the MCV4U curriculum cold. Whiteboard sessions are clutch before tests.', daysAgo: 19 },
        { studentId: STUDENTS.kais, rating: 4, comment: 'Super helpful with related rates. Would book again.', daysAgo: 27 },
        { studentId: STUDENTS.constantin, rating: 5, comment: 'Came in stressed about the optimization unit, left actually confident.', daysAgo: 33 },
      ],
    });
    await liveCourse(TUTORS.showcase, SUBJ.MHF4U, {
      grade: 94, price: [22, 38, 52], sessions: 9,
      reviews: [
        { studentId: STUDENTS.henry, rating: 5, comment: 'Log rules and rational functions finally make sense. 10/10.', daysAgo: 6 },
        { studentId: STUDENTS.kais, rating: 4, comment: 'Great at connecting functions to what shows up on the test.', daysAgo: 14 },
        { studentId: STUDENTS.constantin, rating: 5, comment: 'Explains the *why*, not just the steps. Huge for advanced functions.', daysAgo: 22 },
      ],
    });
    await liveCourse(TUTORS.showcase, SUBJ.SPH4U, {
      grade: 91, price: [25, 42, 58], sessions: 6,
      reviews: [
        { studentId: STUDENTS.constantin, rating: 5, comment: 'Made kinematics + dynamics actually intuitive. Diagrams every time.', daysAgo: 9 },
        { studentId: STUDENTS.henry, rating: 5, comment: 'Electric fields unit saved. Calm and clear under exam pressure.', daysAgo: 17 },
      ],
    });
    await liveCourse(TUTORS.showcase, SUBJ.MDM4U, {
      grade: 96, price: [20, 35, 48], sessions: 4,
      reviews: [
        { studentId: STUDENTS.kais, rating: 5, comment: 'Probability + the culminating project — couldn’t have done it without him.', daysAgo: 8 },
      ],
    });
    // Funnel realism: one verified-but-not-live, one still locked.
    await verifiedNotLive(TUTORS.showcase, SUBJ.SCH4U, 89);
    await q(
      `INSERT INTO public."CourseAssets" (tutor_id, subject_id, status, xp, tier)
       VALUES ($1,$2,'claimed',0,'bronze')
       ON CONFLICT (tutor_id, subject_id) DO UPDATE SET status='claimed', updated_at=now()`,
      [TUTORS.showcase, SUBJ.ENG4U]
    );

    // Roll up overall rating from reviewed live courses.
    const { rows: agg } = await q(
      `SELECT COALESCE(SUM(rating*rating_count)/NULLIF(SUM(rating_count),0),0) AS overall
         FROM public."CourseAssets" WHERE tutor_id=$1 AND rating_count>0`, [TUTORS.showcase]);
    await q(`UPDATE public."Profiles" SET rating=$2 WHERE id=$1`,
      [TUTORS.showcase, Math.round(Number(agg[0].overall) * 100) / 100]);

    // ── Two other real tutors: school + one live verified course each (variety) ──
    await q(`UPDATE public."Profiles" SET institution_id=$2, avatar=$3, education=$4, updated_at=now() WHERE id=$1`,
      [TUTORS.uwo, UNI.Western, avatar('Western Tutor LP'), 'Kinesiology · Western University']);
    await upsertProfileInstitution(TUTORS.uwo, UNI.Western, 'current_university', 'student@uwo.ca');
    await liveCourse(TUTORS.uwo, SUBJ.MHF4U, {
      grade: 88, price: [20, 32, 45], sessions: 3,
      reviews: [{ studentId: STUDENTS.henry, rating: 5, comment: 'Really solid on functions. Flexible scheduling too.', daysAgo: 12 }],
    });
    const { rows: agg2 } = await q(
      `SELECT COALESCE(SUM(rating*rating_count)/NULLIF(SUM(rating_count),0),0) AS overall
         FROM public."CourseAssets" WHERE tutor_id=$1 AND rating_count>0`, [TUTORS.uwo]);
    await q(`UPDATE public."Profiles" SET rating=$2 WHERE id=$1`, [TUTORS.uwo, Math.round(Number(agg2[0].overall) * 100) / 100]);

    await q(`UPDATE public."Profiles" SET institution_id=$2, avatar=$3, education=$4, updated_at=now() WHERE id=$1`,
      [TUTORS.edha, UNI.UofT, avatar('UofT Tutor LP'), 'Life Sciences · University of Toronto']);
    await upsertProfileInstitution(TUTORS.edha, UNI.UofT, 'current_university', 'student@mail.utoronto.ca');
    await liveCourse(TUTORS.edha, SUBJ.SPH4U, {
      grade: 90, price: [24, 40, 54], sessions: 5,
      reviews: [
        { studentId: STUDENTS.kais, rating: 5, comment: 'Physics finally makes sense. Great with worked examples.', daysAgo: 7 },
        { studentId: STUDENTS.constantin, rating: 4, comment: 'Patient and thorough. Helped a ton before the unit test.', daysAgo: 20 },
      ],
    });
    const { rows: agg3 } = await q(
      `SELECT COALESCE(SUM(rating*rating_count)/NULLIF(SUM(rating_count),0),0) AS overall
         FROM public."CourseAssets" WHERE tutor_id=$1 AND rating_count>0`, [TUTORS.edha]);
    await q(`UPDATE public."Profiles" SET rating=$2 WHERE id=$1`, [TUTORS.edha, Math.round(Number(agg3[0].overall) * 100) / 100]);

    // ── A few completed sessions (history for student dashboards) ──
    await q(`DELETE FROM public."Sessions" WHERE status='completed' AND tutor_id=ANY($1)`, [[TUTORS.showcase, TUTORS.uwo, TUTORS.edha]]);
    const sessRows = [
      [TUTORS.showcase, STUDENTS.kais, SUBJ.MCV4U, 'Chain rule & related rates (MCV4U)', 1, 40, 4],
      [TUTORS.showcase, STUDENTS.constantin, SUBJ.MCV4U, 'Optimization problems (MCV4U)', 1.5, 55, 11],
      [TUTORS.showcase, STUDENTS.henry, SUBJ.MHF4U, 'Logarithms review (MHF4U)', 1, 38, 6],
      [TUTORS.showcase, STUDENTS.kais, SUBJ.MDM4U, 'Probability + culminating project (MDM4U)', 1.5, 48, 8],
      [TUTORS.showcase, STUDENTS.constantin, SUBJ.SPH4U, 'Kinematics & dynamics (SPH4U)', 1, 42, 9],
      [TUTORS.edha, STUDENTS.kais, SUBJ.SPH4U, 'Worked examples: forces (SPH4U)', 1, 40, 7],
    ];
    for (const [t, s, subj, topic, dur, amt, daysAgo] of sessRows) {
      await q(
        `INSERT INTO public."Sessions" (tutor_id, student_id, subject_id, status, topic, duration, amount, is_instant, created_at, started_at, ended_at, date)
         VALUES ($1,$2,$3,'completed',$4,$5,$6,false, now() - ($7||' days')::interval, now() - ($7||' days')::interval, now() - ($7||' days')::interval, (now() - ($7||' days')::interval)::date)`,
        [t, s, subj, topic, dur, amt, daysAgo]
      );
    }

    await q('COMMIT');
    console.log('✓ Showcase seed committed.');
  } catch (e) {
    await q('ROLLBACK');
    throw e;
  }

  // Verify
  const v = await q(
    `SELECT s.code, ca.status, ca.grade_value, ca.rating, ca.rating_count, ca.sessions_count, ca.xp, ca.tier, ca.price_1
       FROM public."CourseAssets" ca JOIN public."Subjects" s ON s.id=ca.subject_id
      WHERE ca.tutor_id=$1 ORDER BY ca.xp DESC`, [TUTORS.showcase]);
  console.log('\nShowcase tutor course assets:');
  for (const r of v.rows) console.log(`  ${r.code}  ${r.status}  grade:${r.grade_value}  ⭐${r.rating}(${r.rating_count})  ${r.sessions_count}sess  ${r.xp}xp ${r.tier}  $${r.price_1}+`);
  const p = await q(`SELECT name, rating, education FROM public."Profiles" WHERE id=$1`, [TUTORS.showcase]);
  console.log('\nProfile:', JSON.stringify(p.rows[0]));

  await client.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
