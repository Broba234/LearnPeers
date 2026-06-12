import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/serverAuth";

const KINDS = ["current_university", "current_high_school", "former_high_school"];

// Declare a school affiliation (unverified). University tutors verify via
// school email; everyone can later attach proof-of-enrollment documents.
export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { kind, institutionId, institutionName } = await req.json();

    if (!KINDS.includes(kind)) {
      return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
    }
    if (!institutionId && !institutionName?.trim()) {
      return NextResponse.json({ error: "Provide an institution or a school name" }, { status: 400 });
    }

    if (institutionId) {
      const institution = await prisma.institutions.findUnique({ where: { id: institutionId } });
      if (!institution) {
        return NextResponse.json({ error: "Institution not found" }, { status: 404 });
      }
    }

    const row = await prisma.profileInstitutions.upsert({
      where: { profile_id_kind: { profile_id: user.id, kind } },
      create: {
        profile_id: user.id,
        kind,
        institution_id: institutionId || null,
        institution_name_raw: institutionName?.trim() || null,
      },
      update: {
        institution_id: institutionId || null,
        institution_name_raw: institutionName?.trim() || null,
        // Re-declaring resets any previous verification
        status: "declared",
        verification_method: null,
        verified_email: null,
        updated_at: new Date(),
      },
    });

    return NextResponse.json(row);
  } catch (error) {
    console.error("[EDUCATION] Declare failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rows = await prisma.profileInstitutions.findMany({
      where: { profile_id: user.id },
      include: { Institutions: { select: { id: true, name: true, abbreviation: true, type: true } } },
    });
    return NextResponse.json(rows);
  } catch (error) {
    console.error("[EDUCATION] Fetch failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
