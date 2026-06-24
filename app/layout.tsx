import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Poppins } from 'next/font/google'
import { Toaster } from 'sonner'
import FeedbackWidget from '@/components/FeedbackWidget'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://learnpeers.com'
const SITE_NAME = 'LearnPeers'
const SITE_DESCRIPTION =
  'LearnPeers connects high schoolers with university students who recently aced the same courses. Book live one-on-one tutoring over video — shared whiteboard, screen share, and secure payments. Now in beta.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'LearnPeers — High schoolers, taught by university students who aced it',
    template: '%s · LearnPeers',
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'near-peer tutoring',
    'university student tutors',
    'high school tutoring',
    'Grade 11 tutoring',
    'Grade 12 tutoring',
    'online tutoring',
    'live tutoring',
    'exam prep',
    'find a tutor',
    'LearnPeers',
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  alternates: {
    canonical: '/',
  },
  category: 'education',
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: 'LearnPeers — High schoolers, taught by university students who aced it',
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LearnPeers — High schoolers, taught by university students who aced it',
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#0077be',
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      slogan: 'Learn from the university student who aced your class.',
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      publisher: { '@id': `${SITE_URL}/#organization` },
      inLanguage: 'en',
    },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="/excalidraw.css" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`bg-slate-50 overflow-x-hidden ${poppins.className}`}>
        {children}
        <FeedbackWidget />
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  )
}
