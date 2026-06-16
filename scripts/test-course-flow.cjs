// End-to-end data-layer test for the course-asset flow. Mirrors what the API
// routes do (claim -> verify -> go-live -> review -> sync to ProfilesOnSubjects)
// against a real tutor, prints state, then cleans up after itself.
require('dotenv').config({ path: '.env.local', quiet: true });
const { PrismaClient } = require('../prisma/generated');
const prisma = new PrismaClient();

const TIERS = [['bronze', 0], ['silver', 250], ['gold', 600], ['platinum', 1200], ['diamond', 2500]];
const tierForXp = (xp) => { let k = 'bronze'; for (const [key, min] of TIERS) if (xp >= min) k = key; return k; };

(async () => {
  const tutor = await prisma.profiles.findFirst({ where: { role: 'tutor' }, select: { id: true, email: true } });
  const student = await prisma.profiles.findFirst({ where: { role: 'student' }, select: { id: true } });
  // pick a subject the tutor does NOT already own
  const owned = await prisma.courseAssets.findMany({ where: { tutor_id: tutor.id }, select: { subject_id: true } });
  const ownedIds = new Set(owned.map((o) => o.subject_id));
  const subject = (await prisma.subjects.findMany({ where: { category: 'Mathematics' }, take: 20 }))
    .find((s) => !ownedIds.has(s.id));
  console.log(`tutor=${tutor.email} subject=${subject.code}`);

  // 1) CLAIM
  let asset = await prisma.courseAssets.create({
    data: { tutor_id: tutor.id, subject_id: subject.id, status: 'claimed' },
  });
  console.log('1. claimed ->', asset.status);

  // 2) VERIFY (grade 92% qualifies) -> verified, +120 xp
  let xp = 120;
  asset = await prisma.courseAssets.update({
    where: { id: asset.id },
    data: { status: 'verified', grade_value: '92', grade_scale: 'percentage', verification_method: 'self_attested', verified_at: new Date(), xp, tier: tierForXp(xp) },
  });
  console.log('2. verified ->', asset.status, '| xp', asset.xp, '| tier', asset.tier);

  // 3) GO LIVE (set pricing) -> live, +60 xp, publish PoS
  xp += 60;
  asset = await prisma.courseAssets.update({
    where: { id: asset.id },
    data: { status: 'live', price_1: 30, price_2: 50, price_3: 70, duration_1: 0.5, duration_2: 1, duration_3: 1.5, xp, tier: tierForXp(xp) },
  });
  await prisma.profilesOnSubjects.upsert({
    where: { profile_id_subject_id: { profile_id: tutor.id, subject_id: subject.id } },
    update: { price_1: 30, price_2: 50, price_3: 70 },
    create: { profile_id: tutor.id, subject_id: subject.id, price_1: 30, price_2: 50, price_3: 70, duration_1: 0.5, duration_2: 1, duration_3: 1.5 },
  });
  const pos = await prisma.profilesOnSubjects.findUnique({ where: { profile_id_subject_id: { profile_id: tutor.id, subject_id: subject.id } } });
  console.log('3. live ->', asset.status, '| PoS published:', !!pos, '($' + pos.price_2 + '/h)');

  // 4) REVIEW (student leaves 5 stars) -> rating compounds, +60 xp
  const review = await prisma.courseReviews.create({
    data: { course_asset_id: asset.id, tutor_id: tutor.id, student_id: student.id, rating: 5, comment: 'Outstanding tutor!' },
  });
  const agg = await prisma.courseReviews.aggregate({ where: { course_asset_id: asset.id }, _avg: { rating: true }, _count: true });
  xp += 5 * 12;
  asset = await prisma.courseAssets.update({
    where: { id: asset.id },
    data: { rating: agg._avg.rating, rating_count: agg._count, xp, tier: tierForXp(xp) },
  });
  console.log('4. reviewed ->', asset.rating + '★', '(' + asset.rating_count + ')', '| xp', asset.xp, '| tier', asset.tier);

  // 5) OVERALL rating recompute (weighted)
  const reviewed = await prisma.courseAssets.findMany({ where: { tutor_id: tutor.id, rating_count: { gt: 0 } }, select: { rating: true, rating_count: true } });
  let w = 0, c = 0; for (const a of reviewed) { w += a.rating * a.rating_count; c += a.rating_count; }
  const overall = c ? Math.round((w / c) * 100) / 100 : null;
  console.log('5. overall rating ->', overall);

  // CLEANUP
  await prisma.courseReviews.delete({ where: { id: review.id } });
  await prisma.profilesOnSubjects.delete({ where: { profile_id_subject_id: { profile_id: tutor.id, subject_id: subject.id } } });
  await prisma.courseAssets.delete({ where: { id: asset.id } });
  console.log('cleaned up. ✓ full flow OK');

  await prisma.$disconnect();
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
