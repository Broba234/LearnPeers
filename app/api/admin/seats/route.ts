import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin-access";
import { GRANTABLE_PAGES } from "@/lib/admin-pages";

const GRANTABLE_KEYS = new Set(GRANTABLE_PAGES.map((p) => p.key));

function sanitizePages(pages: unknown): string[] {
  if (!Array.isArray(pages)) return [];
  return [...new Set(pages.filter((p): p is string => typeof p === "string" && GRANTABLE_KEYS.has(p)))];
}

async function requireOwnerCtx() {
  const ctx = await getAdminContext();
  if (!ctx) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!ctx.isOwner) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { ctx };
}

/** List all admin seats (owner + granted seats). */
export async function GET() {
  const { error } = await requireOwnerCtx();
  if (error) return error;

  const seats = await prisma.profiles.findMany({
    where: { OR: [{ role: "admin" }, { is_owner: true }] },
    select: { id: true, name: true, email: true, avatar: true, is_owner: true, admin_pages: true, created_at: true },
    orderBy: [{ is_owner: "desc" }, { created_at: "asc" }],
  });

  return NextResponse.json({ seats });
}

/** Promote an existing registered user to an admin seat with the given pages. */
export async function POST(req: NextRequest) {
  const { error } = await requireOwnerCtx();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const pages = sanitizePages(body.pages);
  if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

  const target = await prisma.profiles.findUnique({ where: { email }, select: { id: true, role: true, is_owner: true } });
  if (!target) {
    return NextResponse.json(
      { error: "No registered user with that email. They must sign up first, then you can grant them a seat." },
      { status: 404 }
    );
  }
  if (target.is_owner) return NextResponse.json({ error: "That user is the owner." }, { status: 409 });

  const updated = await prisma.profiles.update({
    where: { id: target.id },
    data: { role: "admin", admin_pages: pages },
    select: { id: true, name: true, email: true, avatar: true, is_owner: true, admin_pages: true },
  });

  return NextResponse.json({ seat: updated });
}

/** Update a seat's granted pages. */
export async function PATCH(req: NextRequest) {
  const { ctx, error } = await requireOwnerCtx();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  const pages = sanitizePages(body.pages);
  if (!id) return NextResponse.json({ error: "Seat id is required" }, { status: 400 });

  const target = await prisma.profiles.findUnique({ where: { id }, select: { id: true, is_owner: true } });
  if (!target) return NextResponse.json({ error: "Seat not found" }, { status: 404 });
  if (target.is_owner) return NextResponse.json({ error: "The owner's access cannot be edited." }, { status: 409 });
  if (id === ctx!.userId) return NextResponse.json({ error: "You cannot edit your own seat." }, { status: 409 });

  const updated = await prisma.profiles.update({
    where: { id },
    data: { admin_pages: pages },
    select: { id: true, name: true, email: true, avatar: true, is_owner: true, admin_pages: true },
  });

  return NextResponse.json({ seat: updated });
}

/** Revoke a seat's admin access entirely. */
export async function DELETE(req: NextRequest) {
  const { ctx, error } = await requireOwnerCtx();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "Seat id is required" }, { status: 400 });

  const target = await prisma.profiles.findUnique({ where: { id }, select: { id: true, is_owner: true } });
  if (!target) return NextResponse.json({ error: "Seat not found" }, { status: 404 });
  if (target.is_owner) return NextResponse.json({ error: "The owner cannot be revoked." }, { status: 409 });
  if (id === ctx!.userId) return NextResponse.json({ error: "You cannot revoke your own seat." }, { status: 409 });

  // Drop them out of admin. Their underlying account remains; re-grant any time.
  await prisma.profiles.update({
    where: { id },
    data: { role: "student", admin_pages: [] },
  });

  return NextResponse.json({ ok: true });
}
