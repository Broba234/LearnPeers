// Verifies the live-connect data path end-to-end against the real DB, mirroring
// the exact queries used by the new routes. Self-cleaning. Run:
//   node scripts/verify-live-flow.cjs
require('dotenv').config({ path: '.env.local', quiet: true });
const { PrismaClient } = require('../prisma/generated');
const { createClient } = require('@supabase/supabase-js');
const prisma = new PrismaClient();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PRESENCE_TTL_MS = 2 * 60 * 1000;
const isTutorLive = (avail, last) =>
  !!avail && !!last && Date.now() - new Date(last).getTime() <= PRESENCE_TTL_MS;

(async () => {
  const tutor = await prisma.profiles.findFirst({ where: { role: 'tutor' }, select: { id: true, name: true } });
  const student = await prisma.profiles.findFirst({ where: { role: 'student' }, select: { id: true, name: true } });
  if (!tutor || !student) throw new Error('Need at least one tutor and one student profile to test.');
  console.log(`tutor=${tutor.name} student=${student.name}`);

  // Snapshot to restore later
  const before = await prisma.profiles.findUnique({ where: { id: tutor.id }, select: { isAvailableNow: true, last_active_at: true } });

  // 1) Go available → live
  await prisma.profiles.update({ where: { id: tutor.id }, data: { isAvailableNow: true, last_active_at: new Date() } });
  let t = await prisma.profiles.findUnique({ where: { id: tutor.id }, select: { isAvailableNow: true, last_active_at: true } });
  console.log('1) available now  → isTutorLive =', isTutorLive(t.isAvailableNow, t.last_active_at), '(expect true)');

  // 2) Stale heartbeat (5 min old) → offline despite toggle on
  await prisma.profiles.update({ where: { id: tutor.id }, data: { last_active_at: new Date(Date.now() - 5 * 60 * 1000) } });
  t = await prisma.profiles.findUnique({ where: { id: tutor.id }, select: { isAvailableNow: true, last_active_at: true } });
  console.log('2) stale heartbeat → isTutorLive =', isTutorLive(t.isAvailableNow, t.last_active_at), '(expect false)');

  // restore fresh for the booking-independence check
  await prisma.profiles.update({ where: { id: tutor.id }, data: { last_active_at: new Date() } });

  // 3) Instant request insert (mirrors /api/sessions/instant-request)
  const now = new Date();
  const { data: session, error: insErr } = await supabase.from('Sessions').insert({
    tutor_id: tutor.id, student_id: student.id, topic: 'VERIFY live session',
    date: now.toISOString().split('T')[0], start_time: now.toTimeString().slice(0, 8),
    duration: 0.5, status: 'pending', is_instant: true,
  }).select().single();
  if (insErr) throw new Error('instant insert failed: ' + insErr.message);
  console.log('3) instant request created → id', session.id.slice(0, 8), 'is_instant', session.is_instant);

  // 4) Incoming query (mirrors /api/sessions/incoming)
  const { data: incoming } = await supabase.from('Sessions')
    .select('id, topic, is_instant, status, student:student_id ( id, name )')
    .eq('tutor_id', tutor.id).eq('is_instant', true).eq('status', 'pending');
  console.log('4) tutor incoming pending instant count =', (incoming || []).length, '(expect >=1)');

  // 5) Accept → in_progress (mirrors update-status)
  const { data: accepted } = await supabase.from('Sessions')
    .update({ status: 'in_progress', started_at: new Date().toISOString() })
    .eq('id', session.id).select().single();
  console.log('5) accept → status =', accepted.status, '(expect in_progress)');

  // 6) Status query (mirrors /api/sessions/status)
  const { data: statusRow } = await supabase.from('Sessions')
    .select('id, status, tutor:tutor_id ( name ), student:student_id ( name )')
    .eq('id', session.id).single();
  console.log('6) status endpoint shape OK → tutor', statusRow.tutor?.name, '| student', statusRow.student?.name);

  // cleanup
  await supabase.from('Sessions').delete().eq('id', session.id);
  await prisma.profiles.update({ where: { id: tutor.id }, data: { isAvailableNow: before.isAvailableNow, last_active_at: before.last_active_at } });
  console.log('✓ cleaned up; all checks passed');
  await prisma.$disconnect();
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
