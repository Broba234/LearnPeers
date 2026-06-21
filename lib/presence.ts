/**
 * Live-presence rules for "Available Now".
 *
 * A tutor is considered LIVE (connectable right now) when BOTH:
 *   1. They manually turned on Available Now (`isAvailableNow === true`), and
 *   2. Their app has sent a heartbeat recently (`last_active_at` is fresh).
 *
 * This is deliberately decoupled from the tutor's calendar/schedule — the
 * schedule is only for booking ahead of time. Toggling Available Now makes a
 * tutor connectable immediately regardless of whether they have slots today.
 *
 * The freshness window prevents "ghost online" tutors: if someone closes the
 * app without toggling off, their heartbeat stops and they drop offline on
 * their own within PRESENCE_TTL_MS.
 */
export const PRESENCE_TTL_MS = 2 * 60 * 1000; // 2 minutes
export const HEARTBEAT_INTERVAL_MS = 45 * 1000; // client pings every 45s

export function isPresenceFresh(lastActiveAt: Date | string | null | undefined): boolean {
  if (!lastActiveAt) return false;
  const t = lastActiveAt instanceof Date ? lastActiveAt.getTime() : new Date(lastActiveAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= PRESENCE_TTL_MS;
}

export function isTutorLive(
  isAvailableNow: boolean | null | undefined,
  lastActiveAt: Date | string | null | undefined
): boolean {
  return !!isAvailableNow && isPresenceFresh(lastActiveAt);
}
