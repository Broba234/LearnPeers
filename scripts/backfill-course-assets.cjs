// Grandfathers existing tutors into the course-asset model. Every ProfilesOnSubjects
// row that belongs to a tutor becomes a `live`, already-verified CourseAsset so the
// tutor keeps their bookable listings and starts with a fair amount of XP.
// Students' ProfilesOnSubjects rows (their interests) are left untouched.
// Idempotent. Run: node scripts/backfill-course-assets.cjs
require('dotenv').config({ path: '.env.local', quiet: true });
const { PrismaClient } = require('../prisma/generated');
const prisma = new PrismaClient();

// keep in sync with lib/courses.ts
const XP_VERIFY = 120, XP_GO_LIVE = 60;
const TIERS = [['bronze', 0], ['silver', 250], ['gold', 600], ['platinum', 1200], ['diamond', 2500]];
const tierForXp = (xp) => { let k = 'bronze'; for (const [key, min] of TIERS) if (xp >= min) k = key; return k; };

(async () => {
  const tutors = await prisma.profiles.findMany({ where: { role: 'tutor' }, select: { id: true } });
  const tutorIds = new Set(tutors.map((t) => t.id));

  const pos = await prisma.profilesOnSubjects.findMany({
    where: { profile_id: { in: [...tutorIds] } },
  });

  let created = 0, skipped = 0;
  for (const row of pos) {
    const existing = await prisma.courseAssets.findUnique({
      where: { tutor_id_subject_id: { tutor_id: row.profile_id, subject_id: row.subject_id } },
    });
    // An existing ProfilesOnSubjects row means the tutor was already listed/bookable,
    // so grandfather it as live. Invariant: status === 'live' iff a PoS row exists.
    const xp = XP_VERIFY + XP_GO_LIVE;
    const data = {
      institution_course_id: row.institution_course_id ?? null,
      status: 'live',
      grade_value: null,
      grade_scale: null,
      verification_method: 'self_attested',
      verified_at: new Date(),
      price_1: row.price_1, price_2: row.price_2, price_3: row.price_3,
      duration_1: row.duration_1 ?? 0.5, duration_2: row.duration_2 ?? 1, duration_3: row.duration_3 ?? 1.5,
      xp, tier: tierForXp(xp),
    };
    if (existing) { skipped++; continue; }
    await prisma.courseAssets.create({
      data: { tutor_id: row.profile_id, subject_id: row.subject_id, ...data },
    });
    created++;
  }

  console.log(`tutors: ${tutorIds.size} | PoS rows scanned: ${pos.length} | created: ${created} | skipped(existing): ${skipped}`);
  await prisma.$disconnect();
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
