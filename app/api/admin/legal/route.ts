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

function normalizeType(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** List every legal document version with its acceptance count. */
export async function GET() {
  const { error } = await requireOwnerCtx();
  if (error) return error;

  const docs = await prisma.legalDocuments.findMany({
    orderBy: [{ type: "asc" }, { version: "desc" }],
    select: {
      id: true,
      type: true,
      version: true,
      title: true,
      content: true,
      summary: true,
      status: true,
      requires_acceptance: true,
      requires_reacceptance: true,
      effective_date: true,
      published_at: true,
      created_at: true,
      updated_at: true,
    },
  });

  const counts = await prisma.legalAcceptances.groupBy({
    by: ["document_id"],
    _count: { _all: true },
  });
  const countByDoc = new Map(counts.map((c) => [c.document_id, c._count._all]));

  return NextResponse.json({
    documents: docs.map((d) => ({ ...d, acceptanceCount: countByDoc.get(d.id) ?? 0 })),
  });
}

/** Create a new draft version (of an existing or brand-new document type). */
export async function POST(req: NextRequest) {
  const { ctx, error } = await requireOwnerCtx();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const type = normalizeType(body.type);
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const content = typeof body.content === "string" ? body.content.trim() : "";
  const summary = typeof body.summary === "string" && body.summary.trim() ? body.summary.trim() : null;

  if (!type) return NextResponse.json({ error: "A document type is required." }, { status: 400 });
  if (!title) return NextResponse.json({ error: "A title is required." }, { status: 400 });
  if (!content) return NextResponse.json({ error: "Content cannot be empty." }, { status: 400 });

  const latest = await prisma.legalDocuments.findFirst({
    where: { type },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const version = (latest?.version ?? 0) + 1;

  const effective =
    typeof body.effective_date === "string" && body.effective_date
      ? new Date(body.effective_date)
      : null;

  const created = await prisma.legalDocuments.create({
    data: {
      type,
      version,
      title,
      content,
      summary,
      requires_acceptance: body.requires_acceptance !== false,
      requires_reacceptance: body.requires_reacceptance !== false,
      status: "draft",
      effective_date: effective && !isNaN(effective.getTime()) ? effective : null,
      created_by: ctx!.userId,
    },
  });

  return NextResponse.json({ document: { ...created, acceptanceCount: 0 } });
}
