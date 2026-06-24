import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin-access";

export const dynamic = "force-dynamic";

async function requireOwnerCtx() {
  const ctx = await getAdminContext();
  if (!ctx) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!ctx.isOwner) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { ctx };
}

/** One document + a recent slice of its acceptance audit log. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireOwnerCtx();
  if (error) return error;
  const { id } = await params;

  const doc = await prisma.legalDocuments.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [count, recent] = await Promise.all([
    prisma.legalAcceptances.count({ where: { document_id: id } }),
    prisma.legalAcceptances.findMany({
      where: { document_id: id },
      orderBy: { accepted_at: "desc" },
      take: 100,
      select: {
        accepted_at: true,
        ip_address: true,
        method: true,
        Profiles: { select: { name: true, email: true, role: true } },
      },
    }),
  ]);

  return NextResponse.json({ document: { ...doc, acceptanceCount: count }, acceptances: recent });
}

/**
 * Mutate a document. Drafts can be edited, published, archived, or deleted.
 * Published documents are immutable (legal record) — to change them, publish a
 * new version. Publishing archives any previously-published version of the same
 * type so there is exactly one current version.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireOwnerCtx();
  if (error) return error;
  const { id } = await params;

  const doc = await prisma.legalDocuments.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "update";

  if (action === "publish") {
    if (doc.status !== "draft") {
      return NextResponse.json({ error: "Only a draft can be published." }, { status: 409 });
    }
    const now = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      // Retire the current published version of this type, if any.
      await tx.legalDocuments.updateMany({
        where: { type: doc.type, status: "published" },
        data: { status: "archived", updated_at: now },
      });
      return tx.legalDocuments.update({
        where: { id },
        data: {
          status: "published",
          published_at: now,
          effective_date: doc.effective_date ?? now,
          updated_at: now,
        },
      });
    });
    return NextResponse.json({ document: updated });
  }

  if (action === "archive") {
    const updated = await prisma.legalDocuments.update({
      where: { id },
      data: { status: "archived", updated_at: new Date() },
    });
    return NextResponse.json({ document: updated });
  }

  // Default: edit a draft's fields.
  if (doc.status !== "draft") {
    return NextResponse.json(
      { error: "Published documents can't be edited. Create a new version instead." },
      { status: 409 }
    );
  }

  const data: Record<string, unknown> = { updated_at: new Date() };
  if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim();
  if (typeof body.content === "string" && body.content.trim()) data.content = body.content.trim();
  if ("summary" in body) data.summary = body.summary ? String(body.summary).trim() : null;
  if (typeof body.requires_acceptance === "boolean") data.requires_acceptance = body.requires_acceptance;
  if (typeof body.requires_reacceptance === "boolean") data.requires_reacceptance = body.requires_reacceptance;
  if ("effective_date" in body) {
    const d = body.effective_date ? new Date(body.effective_date) : null;
    data.effective_date = d && !isNaN(d.getTime()) ? d : null;
  }

  const updated = await prisma.legalDocuments.update({ where: { id }, data });
  return NextResponse.json({ document: updated });
}

/** Delete a draft. Published/archived versions are kept as a permanent record. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireOwnerCtx();
  if (error) return error;
  const { id } = await params;

  const doc = await prisma.legalDocuments.findUnique({ where: { id }, select: { status: true } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (doc.status !== "draft") {
    return NextResponse.json({ error: "Only drafts can be deleted." }, { status: 409 });
  }

  await prisma.legalDocuments.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
