// Creates the course-asset portfolio tables: CourseAssets (owned, income-producing
// course-assets with verification + gamification state) and CourseReviews (per-course
// reviews that compound a tutor's standing). Idempotent.
// Run: node scripts/course-assets-migration.cjs
require('dotenv').config({ path: '.env.local', quiet: true });
const { PrismaClient } = require('../prisma/generated');
const prisma = new PrismaClient();

const statements = [
  `CREATE TABLE IF NOT EXISTS public."CourseAssets" (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_id uuid NOT NULL REFERENCES public."Profiles"(id) ON DELETE CASCADE,
    subject_id uuid NOT NULL REFERENCES public."Subjects"(id) ON DELETE CASCADE,
    institution_course_id uuid REFERENCES public."InstitutionCourses"(id) ON DELETE SET NULL,
    status text NOT NULL DEFAULT 'claimed',
    grade_value text,
    grade_scale text,
    grade_proof_url text,
    verification_method text,
    verified_at timestamptz,
    rejected_reason text,
    rating double precision NOT NULL DEFAULT 0,
    rating_count integer NOT NULL DEFAULT 0,
    xp integer NOT NULL DEFAULT 0,
    tier text NOT NULL DEFAULT 'bronze',
    sessions_count integer NOT NULL DEFAULT 0,
    total_earnings double precision NOT NULL DEFAULT 0,
    price_1 double precision,
    price_2 double precision,
    price_3 double precision,
    duration_1 double precision DEFAULT 0.5,
    duration_2 double precision DEFAULT 1,
    duration_3 double precision DEFAULT 1.5,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `ALTER TABLE public."CourseAssets" DROP CONSTRAINT IF EXISTS "CourseAssets_tutor_id_subject_id_key"`,
  `ALTER TABLE public."CourseAssets" ADD CONSTRAINT "CourseAssets_tutor_id_subject_id_key" UNIQUE (tutor_id, subject_id)`,
  `CREATE INDEX IF NOT EXISTS "CourseAssets_tutor_id_idx" ON public."CourseAssets"(tutor_id)`,
  `CREATE INDEX IF NOT EXISTS "CourseAssets_status_idx" ON public."CourseAssets"(status)`,

  `CREATE TABLE IF NOT EXISTS public."CourseReviews" (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_asset_id uuid NOT NULL REFERENCES public."CourseAssets"(id) ON DELETE CASCADE,
    tutor_id uuid NOT NULL REFERENCES public."Profiles"(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public."Profiles"(id) ON DELETE CASCADE,
    session_id uuid,
    rating integer NOT NULL,
    comment text,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS "CourseReviews_course_asset_id_idx" ON public."CourseReviews"(course_asset_id)`,
  `CREATE INDEX IF NOT EXISTS "CourseReviews_tutor_id_idx" ON public."CourseReviews"(tutor_id)`,
  // one review per (session, student) when a session is attached
  `CREATE UNIQUE INDEX IF NOT EXISTS "CourseReviews_session_student_unique" ON public."CourseReviews"(session_id, student_id) WHERE session_id IS NOT NULL`,
];

(async () => {
  for (const sql of statements) {
    await prisma.$executeRawUnsafe(sql);
    console.log('ok:', sql.split('\n')[0].slice(0, 70));
  }
  const a = await prisma.$queryRawUnsafe('SELECT count(*)::int AS n FROM public."CourseAssets"');
  const r = await prisma.$queryRawUnsafe('SELECT count(*)::int AS n FROM public."CourseReviews"');
  console.log('CourseAssets rows:', a[0].n, '| CourseReviews rows:', r[0].n);
  await prisma.$disconnect();
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
