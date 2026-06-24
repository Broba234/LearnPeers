import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Legal agreements (Terms of Service, Privacy Policy, …) and the login-time
 * "sign the terms" gate.
 *
 * A user is gated on a document *type* when there is a published version of that
 * type with `requires_acceptance = true` that they have not yet accepted. When a
 * new version is published the gate re-prompts everyone — unless that version is
 * flagged `requires_reacceptance = false`, in which case anyone who accepted an
 * earlier published version of the same type is grandfathered through.
 *
 * The product owner is never gated, so the person who manages the terms can
 * never lock themselves out of the dashboard.
 */

export type DocumentType = "terms_of_service" | "privacy_policy";

export interface PendingDoc {
  id: string;
  type: string;
  version: number;
  title: string;
  content: string;
  summary: string | null;
  effective_date: Date | null;
}

/** The current (highest-version) published document for a given type, or null. */
export async function getPublishedDoc(type: string) {
  return prisma.legalDocuments.findFirst({
    where: { type, status: "published" },
    orderBy: { version: "desc" },
  });
}

/**
 * Documents the given profile still needs to accept before using the app.
 * Returns an empty array when fully up to date.
 */
export async function getPendingLegalDocs(profileId: string): Promise<PendingDoc[]> {
  const published = await prisma.legalDocuments.findMany({
    where: { status: "published", requires_acceptance: true },
    orderBy: [{ type: "asc" }, { version: "desc" }],
    select: {
      id: true,
      type: true,
      version: true,
      title: true,
      content: true,
      summary: true,
      effective_date: true,
      requires_reacceptance: true,
    },
  });

  // Keep only the current (highest) published version per type.
  const currentByType = new Map<string, (typeof published)[number]>();
  for (const doc of published) {
    if (!currentByType.has(doc.type)) currentByType.set(doc.type, doc);
  }
  if (currentByType.size === 0) return [];

  const acceptances = await prisma.legalAcceptances.findMany({
    where: { profile_id: profileId, document_type: { in: [...currentByType.keys()] } },
    select: { document_id: true, document_type: true, document_version: true },
  });
  const acceptedDocIds = new Set(acceptances.map((a) => a.document_id));

  const pending: PendingDoc[] = [];
  for (const [type, current] of currentByType) {
    if (acceptedDocIds.has(current.id)) continue;

    // Grandfather path: this version doesn't force re-acceptance and the user
    // already accepted some earlier published version of the same type.
    if (!current.requires_reacceptance) {
      const acceptedEarlier = acceptances.some(
        (a) => a.document_type === type && a.document_version < current.version
      );
      if (acceptedEarlier) continue;
    }

    pending.push({
      id: current.id,
      type: current.type,
      version: current.version,
      title: current.title,
      content: current.content,
      summary: current.summary,
      effective_date: current.effective_date,
    });
  }
  return pending;
}
