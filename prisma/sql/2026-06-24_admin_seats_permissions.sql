-- Admin BI dashboard: per-seat, per-page permissions.
--
-- Adds an owner flag and a granted-pages array to Profiles. The owner sees
-- everything and manages seats; every other admin only sees the pages listed
-- in admin_pages. Page keys must match lib/admin-access.ts ADMIN_PAGES[].key.

ALTER TABLE "public"."Profiles"
  ADD COLUMN IF NOT EXISTS "is_owner" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "admin_pages" text[] NOT NULL DEFAULT '{}';

-- Promote the product owner. Idempotent.
UPDATE "public"."Profiles"
SET "is_owner" = true,
    "role" = 'admin'
WHERE "email" = 'edouard@learnpeers.com';
