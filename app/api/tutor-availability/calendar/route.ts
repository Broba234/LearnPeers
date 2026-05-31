import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function toHHMM(date: Date) {
  return `${String(date.getUTCHours()).padStart(2,'0')}:${String(date.getUTCMinutes()).padStart(2,'0')}`;
}

function parseISODate(d: Date, tz: string) {
  // returns local dayOfWeek for tz
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' });
  const wd = fmt.format(d).slice(0,3);
  const map: Record<string, number> = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 };
  return map[wd] ?? 0;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tutorId = searchParams.get('tutorId');
    const email = searchParams.get('email');
    const days = Math.min(Math.max(parseInt(searchParams.get('days') || '30', 10) || 30, 1), 60);

    let resolvedTutorId = tutorId ?? '';
    if (!resolvedTutorId && email) {
      const prof = await prisma.profiles.findUnique({ where: { email }, select: { id: true } });
      if (!prof) return NextResponse.json({ error: 'Tutor not found' }, { status: 404 });
      resolvedTutorId = prof.id;
    }
    if (!resolvedTutorId) return NextResponse.json({ error: 'tutorId or email required' }, { status: 400 });

    const allSlots = await prisma.tutorAvailability.findMany({
      where: { tutor_id: resolvedTutorId, is_active: true },
      select: { day_of_week: true, start_time: true, end_time: true, timezone: true, start_date: true, end_date: true },
      orderBy: [{ day_of_week: 'asc' }, { start_time: 'asc' }]
    });

    const tz = allSlots[0]?.timezone || 'UTC';
    const today = new Date();
    const result: { date: string; slots: string[] }[] = [];

    function expandSlot(w: { start_time: Date | null; end_time: Date | null }): string[] {
      if (!w.start_time || !w.end_time) return [];
      const start = toHHMM(w.start_time);
      const end = toHHMM(w.end_time);
      const out: string[] = [];
      let [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      for (let h=sh, m2=sm; (h<eh) || (h===eh && m2<em); ) {
        out.push(`${String(h).padStart(2,'0')}:${String(m2).padStart(2,'0')}`);
        m2 += 30; if (m2>=60) { m2-=60; h+=1; }
      }
      return out;
    }

    for (let i=0; i<days; i++) {
      const dayDate = new Date(today.getTime() + i*86400000);
      const y = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric' }).format(dayDate);
      const m = new Intl.DateTimeFormat('en-CA', { timeZone: tz, month: '2-digit' }).format(dayDate);
      const d = new Intl.DateTimeFormat('en-CA', { timeZone: tz, day: '2-digit' }).format(dayDate);
      const dateStr = `${y}-${m}-${d}`;

      const dayStart = new Date(dayDate); dayStart.setHours(0,0,0,0);
      const dayEnd = new Date(dayDate); dayEnd.setHours(23,59,59,999);
      const dow = parseISODate(dayDate, tz);

      const slotSet = new Set<string>();

      for (const w of allSlots) {
        let matches = false;
        // Match by day_of_week (weekly recurring)
        if (w.day_of_week != null && w.day_of_week === dow) {
          matches = true;
        }
        // Match by start_date/end_date range overlap
        if (w.start_date && w.end_date && w.start_date <= dayEnd && w.end_date >= dayStart) {
          matches = true;
        }
        if (matches) {
          for (const s of expandSlot(w)) slotSet.add(s);
        }
      }

      // Filter out past slots for today — slots are stored in UTC (toHHMM uses getUTCHours)
      let slots = Array.from(slotSet).sort();
      if (i === 0) {
        const now = new Date();
        const nowUTC = `${String(now.getUTCHours()).padStart(2,'0')}:${String(now.getUTCMinutes()).padStart(2,'0')}`;
        slots = slots.filter(s => s > nowUTC);
      }

      result.push({ date: dateStr, slots });
    }

    return NextResponse.json({ timezone: tz, days: result });
  } catch (e: any) {
    console.error('[TA_CAL] Error', e);
    return NextResponse.json({ error: 'Internal Server Error', details: e?.message || e }, { status: 500 });
  }
}
