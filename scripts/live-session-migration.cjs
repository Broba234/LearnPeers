// Adds the columns needed for the live-connect / instant-session flow:
//   - Profiles.last_active_at  → heartbeat timestamp driving "online now" presence
//   - Sessions.is_instant      → flags an on-demand (ring-now) request vs a scheduled booking
// Idempotent. Run: node scripts/live-session-migration.cjs
require('dotenv').config({ path: '.env.local', quiet: true });
const { PrismaClient } = require('../prisma/generated');
const prisma = new PrismaClient();

const statements = [
  `ALTER TABLE public."Profiles" ADD COLUMN IF NOT EXISTS last_active_at timestamptz`,
  `ALTER TABLE public."Sessions" ADD COLUMN IF NOT EXISTS is_instant boolean NOT NULL DEFAULT false`,
  `CREATE INDEX IF NOT EXISTS "Sessions_tutor_status_idx" ON public."Sessions"(tutor_id, status)`,
  `CREATE INDEX IF NOT EXISTS "Sessions_student_status_idx" ON public."Sessions"(student_id, status)`,
  // Make sure anyone who never toggled is treated as offline rather than NULL-ambiguous.
  `UPDATE public."Profiles" SET "isAvailableNow" = false WHERE "isAvailableNow" IS NULL`,
];

(async () => {
  for (const sql of statements) {
    process.stdout.write(`→ ${sql.slice(0, 70)}...\n`);
    await prisma.$executeRawUnsafe(sql);
  }
  console.log('✓ live-session migration complete');
  await prisma.$disconnect();
})().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
