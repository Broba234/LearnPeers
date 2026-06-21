-- Additive schema change to support the full Ontario institution catalogue.
-- 1. external_id  : stable Ministry identifier (Board Number / School Number) for idempotent upserts.
-- 2. board_id     : self-FK linking a high school to its school board.
-- Safe to re-run.

ALTER TABLE "public"."Institutions" ADD COLUMN IF NOT EXISTS "external_id" text;
ALTER TABLE "public"."Institutions" ADD COLUMN IF NOT EXISTS "board_id" uuid;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Institutions_external_id_key') THEN
    ALTER TABLE "public"."Institutions"
      ADD CONSTRAINT "Institutions_external_id_key" UNIQUE ("external_id");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Institutions_board_id_fkey') THEN
    ALTER TABLE "public"."Institutions"
      ADD CONSTRAINT "Institutions_board_id_fkey" FOREIGN KEY ("board_id")
      REFERENCES "public"."Institutions"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Institutions_board_idx" ON "public"."Institutions" ("board_id");
