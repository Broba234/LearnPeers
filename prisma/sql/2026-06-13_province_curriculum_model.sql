-- Scalable Province → Curriculum → Course model.
-- Provincial high-school course codes live ONCE under a province curriculum and
-- resolve to every institution in that province — no per-board duplication.
-- Applied 2026-06-13 via prisma db execute.

-- 1. Provinces / territories (reference table)
CREATE TABLE IF NOT EXISTS "Provinces" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "country" text NOT NULL DEFAULT 'Canada',
  "is_territory" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

-- 2. Curricula — a body of course codes.
--    kind: provincial_secondary (province_id set) | ib | ap (global) | university (institution_id set)
CREATE TABLE IF NOT EXISTS "Curricula" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "kind" text NOT NULL,
  "province_id" uuid REFERENCES "Provinces"("id") ON DELETE CASCADE,
  "institution_id" uuid REFERENCES "Institutions"("id") ON DELETE CASCADE,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
-- One provincial-secondary curriculum per province; one university curriculum per institution
CREATE UNIQUE INDEX IF NOT EXISTS "Curricula_province_kind_uniq"
  ON "Curricula"("province_id", "kind") WHERE "province_id" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Curricula_institution_uniq"
  ON "Curricula"("institution_id") WHERE "institution_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "Curricula_kind_idx" ON "Curricula"("kind");

-- 3. Institutions reference a province (keep legacy text column for now)
ALTER TABLE "Institutions"
  ADD COLUMN IF NOT EXISTS "province_id" uuid REFERENCES "Provinces"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "Institutions_province_idx" ON "Institutions"("province_id");
CREATE INDEX IF NOT EXISTS "Institutions_type_idx" ON "Institutions"("type");

-- 4. Subjects (the course catalog) belong to a curriculum
ALTER TABLE "Subjects"
  ADD COLUMN IF NOT EXISTS "curriculum_id" uuid REFERENCES "Curricula"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "Subjects_curriculum_idx" ON "Subjects"("curriculum_id");
CREATE INDEX IF NOT EXISTS "Subjects_code_idx" ON "Subjects"("code");
CREATE INDEX IF NOT EXISTS "Subjects_category_grade_idx" ON "Subjects"("category", "grade");

-- 5. Hot-path indexes for scale (hundreds of institutions, thousands of courses)
CREATE INDEX IF NOT EXISTS "ProfilesOnSubjects_profile_idx" ON "ProfilesOnSubjects"("profile_id");
CREATE INDEX IF NOT EXISTS "ProfilesOnSubjects_subject_idx" ON "ProfilesOnSubjects"("subject_id");
CREATE INDEX IF NOT EXISTS "InstitutionCourses_subject_idx" ON "InstitutionCourses"("subject_id");

ALTER TABLE "Provinces" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Curricula" ENABLE ROW LEVEL SECURITY;

-- 6. Resolver: institution → applicable courses, WITHOUT storing the cartesian product.
--    Universities → their own curriculum. School boards / high schools → their
--    province's secondary curriculum plus the global IB & AP curricula.
CREATE OR REPLACE VIEW "InstitutionCoursesResolved" AS
  SELECT i.id AS institution_id, s.id AS subject_id, s.code, s.name,
         s.category, s.grade, c.id AS curriculum_id, c.kind AS curriculum_kind
  FROM "Institutions" i
  JOIN "Curricula" c ON c.institution_id = i.id AND c.kind = 'university'
  JOIN "Subjects" s ON s.curriculum_id = c.id
  WHERE i.type = 'university'
UNION ALL
  SELECT i.id, s.id, s.code, s.name, s.category, s.grade, c.id, c.kind
  FROM "Institutions" i
  JOIN "Curricula" c ON ( (c.kind = 'provincial_secondary' AND c.province_id = i.province_id)
                          OR c.kind IN ('ib','ap') )
  JOIN "Subjects" s ON s.curriculum_id = c.id
  WHERE i.type IN ('school_board','high_school');
