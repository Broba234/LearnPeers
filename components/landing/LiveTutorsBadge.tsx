import { prisma } from '@/lib/prisma';
import { PRESENCE_TTL_MS } from '@/lib/presence';

async function getLiveTutorCount(): Promise<number | null> {
  try {
    return await prisma.profiles.count({
      where: {
        is_tutor: true,
        isAvailableNow: true,
        last_active_at: { gte: new Date(Date.now() - PRESENCE_TTL_MS) },
      },
    });
  } catch {
    return null;
  }
}

export default async function LiveTutorsBadge() {
  const count = await getLiveTutorCount();
  if (!count) return null;

  return (
    <span className="flex items-center gap-1.5">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
      </span>
      {count === 1 ? '1 tutor online now' : `${count} tutors online now`}
    </span>
  );
}
