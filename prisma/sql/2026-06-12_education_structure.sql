-- Education structure: institution types, affiliations, school-email verification
-- Applied 2026-06-12 via prisma db execute (see scripts/run-sql.cjs)

ALTER TABLE "Institutions"
  ADD COLUMN IF NOT EXISTS "type" text NOT NULL DEFAULT 'university',
  ADD COLUMN IF NOT EXISTS "email_domains" text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "city" text,
  ADD COLUMN IF NOT EXISTS "website" text;

CREATE TABLE IF NOT EXISTS "ProfileInstitutions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "profile_id" uuid NOT NULL REFERENCES "Profiles"("id") ON DELETE CASCADE,
  "institution_id" uuid REFERENCES "Institutions"("id") ON DELETE SET NULL,
  "institution_name_raw" text,
  "kind" text NOT NULL, -- current_university | current_high_school | former_high_school
  "status" text NOT NULL DEFAULT 'declared', -- declared | pending | verified | rejected
  "verification_method" text, -- school_email | document
  "verified_email" text,
  "document_url" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "ProfileInstitutions_profile_kind_unique" UNIQUE ("profile_id", "kind")
);
CREATE INDEX IF NOT EXISTS "ProfileInstitutions_profile_idx" ON "ProfileInstitutions"("profile_id");
CREATE INDEX IF NOT EXISTS "ProfileInstitutions_institution_idx" ON "ProfileInstitutions"("institution_id");

CREATE TABLE IF NOT EXISTS "SchoolEmailVerifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "profile_id" uuid NOT NULL REFERENCES "Profiles"("id") ON DELETE CASCADE,
  "institution_id" uuid NOT NULL REFERENCES "Institutions"("id") ON DELETE CASCADE,
  "email" text NOT NULL,
  "code_hash" text NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "consumed_at" timestamptz,
  "attempts" int NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "SchoolEmailVerifications_profile_idx" ON "SchoolEmailVerifications"("profile_id");

-- RLS consistent with the rest of the schema (API uses service connection)
ALTER TABLE "ProfileInstitutions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SchoolEmailVerifications" ENABLE ROW LEVEL SECURITY;
