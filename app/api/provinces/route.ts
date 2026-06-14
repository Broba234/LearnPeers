import { prisma } from "@/lib/prisma";

// Reference list of provinces/territories for admin + onboarding dropdowns.
export async function GET() {
  try {
    const provinces = await prisma.provinces.findMany({
      orderBy: [{ is_territory: "asc" }, { name: "asc" }],
      select: { id: true, code: true, name: true, is_territory: true },
    });
    return Response.json(provinces);
  } catch (error: any) {
    return Response.json({ error: "Internal Server Error", details: error?.message }, { status: 500 });
  }
}
