import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://learnpeers.com'

async function getPublicTutorIds() {
  try {
    const tutors = await prisma.profiles.findMany({
      where: {
        role: 'tutor',
        CourseAssets: { some: { status: { in: ['live', 'verified'] } } },
      },
      select: { id: true, updated_at: true },
    })
    return tutors
  } catch {
    // Sitemap generation must never fail the build if the DB is unreachable.
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const tutors = await getPublicTutorIds()

  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${SITE_URL}/tutors`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/auth/register`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/auth/login`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    ...tutors.map((t) => ({
      url: `${SITE_URL}/tutor/${t.id}`,
      lastModified: t.updated_at ?? now,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
  ]
}
