-- Drop the unbuilt chat feature: Conversations + Messages.
-- These tables have zero references anywhere in the codebase (no prisma.* access,
-- no supabase.from('Conversations'|'Messages')), and were removed from
-- prisma/schema.prisma in the same change. Messages FKs Conversations, so it is
-- dropped first.
--
-- Reversible note: re-create from git history of prisma/schema.prisma if needed.

DROP TABLE IF EXISTS "public"."Messages";
DROP TABLE IF EXISTS "public"."Conversations";
