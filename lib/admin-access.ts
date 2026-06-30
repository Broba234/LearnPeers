import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ADMIN_PAGES, pageByKey } from "@/lib/admin-pages";

/**
 * Admin RBAC for the BI dashboard.
 *
 * Access model (per the product owner): there is a single OWNER who can see and
 * do everything, including managing seats. Every other admin is a "seat" whose
 * access is granted page-by-page via `Profiles.admin_pages`. Permissions are
 * editable at any time from the Access page.
 *
 * The page registry itself lives in lib/admin-pages.ts (client-safe).
 */

export { ADMIN_PAGES, GRANTABLE_PAGES, pageByKey } from "@/lib/admin-pages";
export type { AdminPage, PageGroup } from "@/lib/admin-pages";

export interface AdminContext {
  userId: string;
  email: string;
  name: string | null;
  avatar: string | null;
  isOwner: boolean;
  /** Set of page keys this admin may access. */
  allowedPages: Set<string>;
  can: (pageKey: string) => boolean;
}

/**
 * Resolve the current request's admin context, or `null` if the requester is
 * not a signed-in admin. Does not redirect — callers decide.
 *
 * Wrapped in React `cache` so the layout guard and a page/segment guard within
 * the same request share a single auth + DB lookup.
 */
export const getAdminContext = cache(async function getAdminContext(): Promise<AdminContext | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const profile = await prisma.profiles.findUnique({
    where: { email: user.email },
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      role: true,
      is_owner: true,
      admin_pages: true,
    },
  });

  if (!profile) return null;

  const isOwner = profile.is_owner === true;
  // Only owners or role=admin seats get in.
  if (!isOwner && profile.role !== "admin") return null;

  const allowedPages = new Set<string>();
  if (isOwner) {
    for (const p of ADMIN_PAGES) allowedPages.add(p.key);
  } else {
    for (const key of profile.admin_pages ?? []) {
      const page = pageByKey(key);
      if (page && !page.ownerOnly) allowedPages.add(key);
    }
  }

  return {
    userId: profile.id,
    email: profile.email,
    name: profile.name,
    avatar: profile.avatar,
    isOwner,
    allowedPages,
    can: (pageKey: string) => allowedPages.has(pageKey),
  };
});

/**
 * Page-level guard for server components. Ensures the requester is an admin who
 * can access `pageKey`; otherwise redirects. Returns the context on success.
 */
export async function requireAdminPage(pageKey: string): Promise<AdminContext> {
  const ctx = await getAdminContext();
  if (!ctx) redirect("/admin/login");
  if (!ctx.can(pageKey)) {
    // Send them to the first page they *can* see, or login if none.
    const firstAllowed = ADMIN_PAGES.find((p) => ctx.allowedPages.has(p.key));
    redirect(firstAllowed ? firstAllowed.path : "/admin/login");
  }
  return ctx;
}

/** Owner-only guard (for the Access page + seat APIs). */
export async function requireOwner(): Promise<AdminContext> {
  const ctx = await getAdminContext();
  if (!ctx) redirect("/admin/login");
  if (!ctx.isOwner) redirect("/dashboard");
  return ctx;
}

/**
 * API-route admin guard. Like `requireAdminPage` but returns a JSON response
 * (401/403) instead of redirecting, for use inside route handlers.
 *
 *   const { ctx, res } = await requireAdminApi("contacts");
 *   if (res) return res; // 401 if not signed in, 403 if not allowed
 *   // ...ctx is an authorized admin
 */
export async function requireAdminApi(pageKey?: string): Promise<
  { ctx: AdminContext; res: null } | { ctx: null; res: NextResponse }
> {
  const ctx = await getAdminContext();
  if (!ctx) {
    return { ctx: null, res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (pageKey && !ctx.can(pageKey)) {
    return { ctx: null, res: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ctx, res: null };
}
