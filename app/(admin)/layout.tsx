import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import AppHeader from "@/layout/AppHeader"
import AppSidebar from "@/layout/AppSidebar"
import React from "react"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    redirect('/admin/login')
  }

  const profile = await prisma.profiles.findUnique({
    where: { email: user.email },
    select: { role: true },
  })

  if (profile?.role !== 'admin') {
    redirect('/admin/login')
  }

  return (
    <div className="min-h-screen xl:flex">
      <AppSidebar />
      <div className="flex-1 transition-all duration-300 ease-in-out">
        <AppHeader />
        <div className="p-4 ml-[20%] max-w-[1440px] md:p-6">{children}</div>
      </div>
    </div>
  )
}
