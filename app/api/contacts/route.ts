import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin-access";

export async function GET() {
  try {
    // Admin-only: returns every contact submission (PII). The POST below stays
    // public for the contact form (route is allowlisted in proxy.ts).
    const { res } = await requireAdminApi("contacts");
    if (res) return res;

    const contacts = await prisma.contacts.findMany({
      orderBy: { created_at: "desc" },
    });

    return new Response(JSON.stringify(contacts), { status: 200 });
  } catch (error: any) {
    console.error("[CONTACTS_GET]", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
      }),
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { name, email, subject, message } = await req.json();

    if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
      return new Response(
        JSON.stringify({ error: "All fields are required" }),
        { status: 400 }
      );
    }

    const contact = await prisma.contacts.create({
      data: {
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
      },
    });

    return new Response(JSON.stringify(contact), { status: 201 });
  } catch (error: any) {
    console.error("[CONTACTS_POST]", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
      }),
      { status: 500 }
    );
  }
}
