// Seeds a roster of REAL verified peer tutors (auth user + profile + verified
// school + live course-assets + bookable listings + reviews + weekly
// availability) so the pitch-deck screenshots — course-code search, booking /
// instant connect — render a populated, credible product. Idempotent.
//
//   node scripts/seed-deck.mjs
//
import fs from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync(path.resolve('.env.local'), 'utf8');
const getEnv = (k) => {
  const line = env.split('\n').find((l) => l.startsWith(k + '='));
  return line ? line.replace(k + '=', '').trim().replace(/^"|"$/g, '') : '';
};
const DATABASE_URL = getEnv('DATABASE_URL');
const SUPABASE_URL = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const SERVICE_ROLE = getEnv('SUPABASE_SERVICE_ROLE_KEY');

const client = new Client({ connectionString: DATABASE_URL });
const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } });

const SUBJ = {
  MCV4U: '42c364df-446c-41b6-ae0f-d1b56257b94c',
  MHF4U: 'b6713ba7-931b-4d3d-aaed-2fa8c94e2694',
  SPH4U: '23a15997-fb3c-421b-9a11-4d2b4bf93c1f',
  SCH4U: 'a171a6a3-4ab8-41cd-b1f3-b3d91d0c23d2',
  MDM4U: '72a8cf5c-a187-4027-b724-f05334314be5',
};
const UNI = {
  Waterloo: '98805694-e9d7-4560-bd76-784928a6e38c',
  UofT: 'b2923269-3380-4512-a428-d6aa08465556',
  Western: '557580fb-8110-480d-b308-8959bd265dac',
  McMaster: 'da8860f0-124e-46af-bb09-524968c67a59',
  Queens: '2a1ff84d-7863-4fae-b496-c9771b7946e9',
  Guelph: '10a56548-4dcf-4246-a8c2-2062e4d64ba9',
};
// Existing students used as review authors.
const STUDENTS = {
  kais: '04b67ebc-9245-4026-a0d6-c33901238bca',
  constantin: '1bda0c91-4f83-4ffa-9ff3-60b4821b9f92',
  henry: 'e9f26178-b7d1-46a1-8767-c0b7e9dddf7d',
};
const REVIEWERS = Object.values(STUDENTS);
const avatar = (seed) => `https://api.dicebear.com/9.x/notionists/png?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

const XP = { verify: 120, goLive: 60, session: 20, review: (r) => Math.round(r) * 12 };
const TIERS = [['bronze', 0], ['silver', 250], ['gold', 600], ['platinum', 1200], ['diamond', 2500]];
const tierForXp = (xp) => { let k = 'bronze'; for (const [key, min] of TIERS) if (xp >= min) k = key; return k; };
const q = (sql, params) => client.query(sql, params);

// ── Roster ──────────────────────────────────────────────────────────────────
const TUTORS = [
  {
    email: 'priya.sharma.lp@learnpeers.dev', name: 'Priya S.', inst: 'Waterloo', instAbbr: 'UW',
    education: 'Mathematics (CS) · University of Waterloo', schoolEmail: 'psharma@uwaterloo.ca',
    bio: '3rd-year Math/CS @ Waterloo. I aced MCV4U and Advanced Functions and now I help Grade-12s see the structure behind calculus instead of memorizing it. Lots of worked examples, zero judgment.',
    liveNow: true,
    courses: [
      { subj: 'MCV4U', grade: 98, price: [26, 42, 56], sessions: 21, reviews: [
        { r: 5, c: 'Priya makes the chain rule feel obvious. Went from a 71 to a 90 on my unit test.', d: 3 },
        { r: 5, c: 'Best calc tutor on here. She knows exactly what the MCV4U exam asks.', d: 9 },
        { r: 5, c: 'Patient and crazy good at related rates. Booked her 4 times now.', d: 16 },
        { r: 4, c: 'Super clear with optimization. Highly recommend before tests.', d: 24 },
      ]},
      { subj: 'MHF4U', grade: 96, price: [24, 38, 52], sessions: 12, reviews: [
        { r: 5, c: 'Log rules finally clicked. She connects everything back to the graph.', d: 6 },
        { r: 5, c: 'Advanced Functions used to terrify me. Not anymore.', d: 20 },
      ]},
    ],
  },
  {
    email: 'liam.chen.lp@learnpeers.dev', name: 'Liam C.', inst: 'UofT', instAbbr: 'UofT',
    education: 'Engineering Science · University of Toronto', schoolEmail: 'liam.chen@mail.utoronto.ca',
    bio: '2nd-year EngSci @ U of T. Calculus and physics are my whole life right now — I tutor MCV4U and SPH4U the way I wish I had been taught: build the intuition first, then crush the problems.',
    liveNow: true,
    courses: [
      { subj: 'MCV4U', grade: 99, price: [28, 46, 62], sessions: 18, reviews: [
        { r: 5, c: 'Liam got a 99 in MCV4U and it shows. Vectors finally make sense.', d: 2 },
        { r: 5, c: 'Explains the why behind every step. My grade jumped two letters.', d: 8 },
        { r: 5, c: 'Calm, sharp, and never rushes. Worth every dollar.', d: 14 },
      ]},
      { subj: 'SPH4U', grade: 95, price: [28, 46, 62], sessions: 9, reviews: [
        { r: 5, c: 'Dynamics and fields unit — saved my grade with two sessions.', d: 5 },
        { r: 4, c: 'Great with worked examples and free-body diagrams.', d: 19 },
      ]},
    ],
  },
  {
    email: 'aanya.patel.lp@learnpeers.dev', name: 'Aanya P.', inst: 'McMaster', instAbbr: 'McMaster',
    education: 'Health Sciences · McMaster University', schoolEmail: 'patela@mcmaster.ca',
    bio: '2nd-year Health Sci @ Mac. I tutor MCV4U and Data Management — the two courses that got me my scholarship. Big on study systems and exam strategy, not just answers.',
    liveNow: false,
    courses: [
      { subj: 'MCV4U', grade: 96, price: [24, 39, 54], sessions: 15, reviews: [
        { r: 5, c: 'Aanya is so encouraging. Made me actually enjoy calc.', d: 4 },
        { r: 5, c: 'Broke down implicit differentiation perfectly. 10/10.', d: 13 },
        { r: 4, c: 'Helpful and organized. Sends notes after every session.', d: 22 },
      ]},
      { subj: 'MDM4U', grade: 94, price: [22, 35, 48], sessions: 7, reviews: [
        { r: 5, c: 'Probability + the culminating project — couldn’t have done it without her.', d: 10 },
      ]},
    ],
  },
  {
    email: 'noah.williams.lp@learnpeers.dev', name: 'Noah W.', inst: 'Western', instAbbr: 'Western',
    education: 'Medical Sciences · Western University', schoolEmail: 'nwillia@uwo.ca',
    bio: '1st-year Med Sci @ Western. Just finished Grade 12 so the MCV4U and Chemistry curriculum is fresh — I remember exactly where everyone gets stuck and how to get unstuck.',
    liveNow: true,
    courses: [
      { subj: 'MCV4U', grade: 92, price: [22, 36, 50], sessions: 8, reviews: [
        { r: 5, c: 'Noah just did this course so he gets the new exam format. Clutch.', d: 7 },
        { r: 4, c: 'Really patient with curve sketching. Recommend.', d: 18 },
      ]},
      { subj: 'SCH4U', grade: 91, price: [22, 36, 50], sessions: 5, reviews: [
        { r: 5, c: 'Equilibrium and thermochem made simple. Big help before finals.', d: 12 },
      ]},
    ],
  },
  {
    email: 'sofia.rossi.lp@learnpeers.dev', name: 'Sofia R.', inst: 'Queens', instAbbr: "Queen's",
    education: 'Commerce · Queen’s University', schoolEmail: 'sofia.rossi@queensu.ca',
    bio: '3rd-year Commerce @ Queen’s. I aced MCV4U and Data Management and I tutor both — especially great if you want the math *and* the test-taking strategy that gets you the 90+.',
    liveNow: false,
    courses: [
      { subj: 'MCV4U', grade: 94, price: [25, 40, 55], sessions: 11, reviews: [
        { r: 5, c: 'Sofia is so good at making calc feel manageable. Less stress instantly.', d: 5 },
        { r: 4, c: 'Solid on rates of change. Flexible with scheduling too.', d: 17 },
      ]},
      { subj: 'MDM4U', grade: 97, price: [23, 37, 50], sessions: 9, reviews: [
        { r: 5, c: 'Stats and probability genius. Walked me through the whole project.', d: 8 },
        { r: 5, c: 'Best MDM4U help I found anywhere. Worth it.', d: 21 },
      ]},
    ],
  },
  {
    email: 'ethan.brown.lp@learnpeers.dev', name: 'Ethan B.', inst: 'Guelph', instAbbr: 'Guelph',
    education: 'Engineering · University of Guelph', schoolEmail: 'ebrown@uoguelph.ca',
    bio: '2nd-year Engineering @ Guelph. MCV4U was my favourite course — I tutor it problem-first, with a shared whiteboard so we can actually work through the hard ones together.',
    liveNow: false,
    courses: [
      { subj: 'MCV4U', grade: 91, price: [21, 34, 47], sessions: 6, reviews: [
        { r: 5, c: 'Ethan is great on the whiteboard. Vectors finally make sense.', d: 6 },
        { r: 4, c: 'Down to earth and easy to follow. Booked again already.', d: 15 },
      ]},
    ],
  },
];

async function ensureAuthUser(email) {
  // Idempotent: reuse the profile id if it already exists.
  const existing = await q(`SELECT id FROM public."Profiles" WHERE email=$1`, [email]);
  if (existing.rows[0]) return existing.rows[0].id;
  // Otherwise look for an existing auth user, else create one.
  const { data: created, error } = await admin.auth.admin.createUser({
    email, password: 'Deck$Seed123', email_confirm: true,
  });
  if (error) {
    if (/already been registered|already exists/i.test(error.message)) {
      // Find the existing auth user id by paging through the list.
      for (let page = 1; page <= 20; page++) {
        const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        const u = data?.users?.find((x) => x.email?.toLowerCase() === email.toLowerCase());
        if (u) return u.id;
        if (!data?.users?.length || data.users.length < 200) break;
      }
      throw new Error(`Auth user exists for ${email} but could not be located`);
    }
    throw error;
  }
  return created.user.id;
}

async function upsertProfileInstitution(profileId, institutionId, verifiedEmail) {
  await q(
    `INSERT INTO public."ProfileInstitutions" (profile_id, institution_id, kind, status, verification_method, verified_email)
     VALUES ($1,$2,'current_university','verified','school_email',$3)
     ON CONFLICT (profile_id, kind)
     DO UPDATE SET institution_id=EXCLUDED.institution_id, status='verified', verification_method='school_email', verified_email=EXCLUDED.verified_email, updated_at=now()`,
    [profileId, institutionId, verifiedEmail]
  );
}

async function liveCourse(tutorId, subjectId, { grade, price, sessions, reviews }) {
  const reviewXp = reviews.reduce((s, r) => s + XP.review(r.r), 0);
  const xp = XP.verify + XP.goLive + sessions * XP.session + reviewXp;
  const ratingCount = reviews.length;
  const rating = ratingCount ? Math.round((reviews.reduce((s, r) => s + r.r, 0) / ratingCount) * 100) / 100 : 0;
  const earnings = sessions * price[1];

  const { rows } = await q(
    `INSERT INTO public."CourseAssets"
       (tutor_id, subject_id, status, grade_value, grade_scale, verification_method, verified_at,
        rating, rating_count, xp, tier, sessions_count, total_earnings,
        price_1, price_2, price_3, duration_1, duration_2, duration_3)
     VALUES ($1,$2,'live',$3,'percentage','transcript', now() - interval '24 days',
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

  await q(
    `INSERT INTO public."ProfilesOnSubjects" (profile_id, subject_id, price_1, price_2, price_3, duration_1, duration_2, duration_3)
     VALUES ($1,$2,$3,$4,$5,0.5,1,1.5)
     ON CONFLICT (profile_id, subject_id) DO UPDATE SET price_1=EXCLUDED.price_1, price_2=EXCLUDED.price_2, price_3=EXCLUDED.price_3, updated_at=now()`,
    [tutorId, subjectId, price[0], price[1], price[2]]
  );

  await q(`DELETE FROM public."CourseReviews" WHERE course_asset_id=$1`, [assetId]);
  for (let i = 0; i < reviews.length; i++) {
    const rv = reviews[i];
    await q(
      `INSERT INTO public."CourseReviews" (course_asset_id, tutor_id, student_id, rating, comment, created_at)
       VALUES ($1,$2,$3,$4,$5, now() - ($6 || ' days')::interval)`,
      [assetId, tutorId, REVIEWERS[i % REVIEWERS.length], rv.r, rv.c, rv.d]
    );
  }
}

// Weekly recurring availability so the booking calendar shows real slots.
async function seedAvailability(tutorId, subjectId) {
  await q(`DELETE FROM public."TutorAvailability" WHERE tutor_id=$1`, [tutorId]);
  // Afternoons/evenings (UTC) across the week — plenty of bookable slots.
  const windows = [
    [1, '16:00:00', '20:00:00'],
    [2, '17:00:00', '21:00:00'],
    [3, '16:00:00', '20:00:00'],
    [4, '17:00:00', '21:00:00'],
    [5, '15:00:00', '19:00:00'],
    [0, '17:00:00', '20:00:00'],
    [6, '15:00:00', '18:00:00'],
  ];
  for (const [dow, start, end] of windows) {
    await q(
      `INSERT INTO public."TutorAvailability" (tutor_id, subject_id, day_of_week, start_time, end_time, timezone, is_active, duration_1, duration_2, duration_3)
       VALUES ($1,$2,$3,$4::time,$5::time,'UTC',true,30,60,90)`,
      [tutorId, subjectId, dow, start, end]
    );
  }
}

async function main() {
  await client.connect();
  await q('BEGIN');
  try {
    for (const t of TUTORS) {
      const id = await ensureAuthUser(t.email);
      await q(
        `INSERT INTO public."Profiles" (id, email, name, role, bio, education, avatar, institution_id, rating, "isAvailableNow", last_active_at, profile_setup, is_tutor, created_at, updated_at)
         VALUES ($1,$2,$3,'tutor',$4,$5,$6,$7,NULL,$8,$9,true,true,now(),now())
         ON CONFLICT (id) DO UPDATE SET
           name=EXCLUDED.name, role='tutor', bio=EXCLUDED.bio, education=EXCLUDED.education,
           avatar=EXCLUDED.avatar, institution_id=EXCLUDED.institution_id,
           "isAvailableNow"=EXCLUDED."isAvailableNow", last_active_at=EXCLUDED.last_active_at,
           profile_setup=true, is_tutor=true, updated_at=now()`,
        [id, t.email, t.name, t.bio, t.education, avatar(t.name + ' LP'), UNI[t.inst], t.liveNow, t.liveNow ? new Date() : null]
      );
      await upsertProfileInstitution(id, UNI[t.inst], t.schoolEmail);
      for (const c of t.courses) {
        await liveCourse(id, SUBJ[c.subj], { grade: c.grade, price: c.price, sessions: c.sessions, reviews: c.reviews });
      }
      // Availability tied to the tutor's MCV4U listing.
      await seedAvailability(id, SUBJ.MCV4U);
      // Roll up overall rating from reviewed live courses.
      const { rows: agg } = await q(
        `SELECT COALESCE(SUM(rating*rating_count)/NULLIF(SUM(rating_count),0),0) AS overall
           FROM public."CourseAssets" WHERE tutor_id=$1 AND rating_count>0`, [id]);
      await q(`UPDATE public."Profiles" SET rating=$2 WHERE id=$1`, [id, Math.round(Number(agg[0].overall) * 100) / 100]);
    }

    // Give the existing showcase tutor (Edouard T.) availability too, so the
    // booking calendar works when his profile is opened.
    await seedAvailability('9ecbab70-09e5-48ec-b9a9-ac34f928b02a', SUBJ.MCV4U);

    await q('COMMIT');
    console.log('✓ Deck seed committed.');
  } catch (e) {
    await q('ROLLBACK');
    throw e;
  }

  const v = await q(
    `SELECT p.name, i.abbreviation AS school, ca.grade_value AS mcv4u, p.rating
       FROM public."Profiles" p
       JOIN public."CourseAssets" ca ON ca.tutor_id=p.id AND ca.subject_id=$1 AND ca.status='live'
       LEFT JOIN public."Institutions" i ON i.id=p.institution_id
      WHERE p.email LIKE '%@learnpeers.dev'
      ORDER BY ca.grade_value::int DESC`, [SUBJ.MCV4U]);
  console.log('\nMCV4U verified graders seeded:');
  for (const r of v.rows) console.log(`  ${String(r.name).padEnd(10)} ${String(r.school).padEnd(9)} MCV4U ${r.mcv4u}%  ⭐${r.rating}`);
  await client.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
