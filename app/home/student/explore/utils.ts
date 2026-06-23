import type { AvailableSlot, SortKey, Subjects, Tutor } from "./types";

const toSlotMinutes = (value?: string | Date | null): number | null => {
  if (!value) return null;
  if (typeof value === "string") {
    const m = value.match(/T(\d{2}):(\d{2})/);
    if (m) return parseInt(m[1]) * 60 + parseInt(m[2]);
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.getUTCHours() * 60 + d.getUTCMinutes();
};

export function countTimeSlots(availableSlots: AvailableSlot[]): number {
  const SLOT_DURATION = 30;
  const unique = new Set<number>();
  for (const slot of availableSlots) {
    const start = toSlotMinutes(slot.start_time);
    const end = toSlotMinutes(slot.end_time);
    if (start === null || end === null || end <= start) continue;
    for (let t = start; t + SLOT_DURATION <= end; t += SLOT_DURATION) {
      unique.add(t);
    }
  }
  return unique.size;
}

export function currentTimeInTz(tz: string): string {
  try {
    return new Date().toLocaleTimeString("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
}

export function getStartingPrice(subjects: Subjects[]): number | null {
  let min: number | null = null;
  for (const s of subjects) {
    for (const p of [s.price_1, s.price_2, s.price_3]) {
      const n = typeof p === "string" ? parseFloat(p) : p;
      if (typeof n === "number" && !isNaN(n) && (min === null || n < min))
        min = n;
    }
  }
  return min;
}

export const SORT_LABELS: Record<SortKey, string> = {
  recommended: "Recommended",
  rating: "Top rated",
  sessions: "Most sessions",
  price: "Price: low to high",
};

function tutorMatchesQuery(tutor: Tutor, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  if (tutor.name?.toLowerCase().includes(needle)) return true;
  if (tutor.schoolName?.toLowerCase().includes(needle)) return true;
  if (tutor.schoolAbbr?.toLowerCase().includes(needle)) return true;
  if (tutor.verifiedSchool?.name?.toLowerCase().includes(needle)) return true;
  return (tutor.subjects ?? []).some(
    (s) =>
      s.code?.toLowerCase().includes(needle) ||
      s.name?.toLowerCase().includes(needle)
  );
}

export function filterAndSortTutors(list: Tutor[], q: string, sortBy: SortKey): Tutor[] {
  const filtered = q ? list.filter((t) => tutorMatchesQuery(t, q)) : list.slice();
  switch (sortBy) {
    case "rating":
      filtered.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
      break;
    case "sessions":
      filtered.sort((a, b) => (b.totalSessions ?? 0) - (a.totalSessions ?? 0));
      break;
    case "price":
      filtered.sort((a, b) => {
        const pa = getStartingPrice(a.subjects ?? []) ?? Infinity;
        const pb = getStartingPrice(b.subjects ?? []) ?? Infinity;
        return pa - pb;
      });
      break;
    // "recommended" keeps the server ordering (live first, then credibility)
  }
  return filtered;
}
