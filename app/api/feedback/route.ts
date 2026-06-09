import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// POST: store a feedback message. If the visitor is signed in, the message is
// automatically linked to their profile (user_id / email / name). No email is
// sent — messages are stored in the database only.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const page = typeof body?.page === "string" ? body.page.slice(0, 500) : null;

    if (!message) {
      return Response.json({ error: "Message is required" }, { status: 400 });
    }
    if (message.length > 5000) {
      return Response.json({ error: "Message is too long" }, { status: 400 });
    }

    // Resolve the signed-in user (if any) from the Supabase session cookies.
    let userId: string | null = null;
    let email: string | null = null;
    let name: string | null = null;

    try {
      const supabase = await createSupabaseServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        userId = user.id;
        email = user.email ?? null;
        // Prefer the profile name; fall back to auth metadata.
        const profile = await prisma.profiles.findUnique({
          where: { id: user.id },
          select: { name: true, email: true },
        });
        name =
          profile?.name ??
          (typeof user.user_metadata?.name === "string"
            ? user.user_metadata.name
            : null);
        email = email ?? profile?.email ?? null;
      }
    } catch {
      // Anonymous feedback is still accepted if the session lookup fails.
    }

    const userAgent = req.headers.get("user-agent")?.slice(0, 500) ?? null;

    const feedback = await prisma.feedback.create({
      data: {
        message,
        user_id: userId,
        email,
        name,
        page,
        user_agent: userAgent,
      },
      select: { id: true, created_at: true },
    });

    return Response.json({ ok: true, id: feedback.id }, { status: 201 });
  } catch (error: any) {
    return Response.json(
      { error: "Internal Server Error", details: error?.message ?? String(error) },
      { status: 500 }
    );
  }
}

// GET: list feedback for the admin dashboard.
export async function GET() {
  try {
    const feedback = await prisma.feedback.findMany({
      orderBy: { created_at: "desc" },
      include: {
        Profiles: { select: { name: true, email: true, role: true } },
      },
    });
    return Response.json(feedback, { status: 200 });
  } catch (error: any) {
    return Response.json(
      { error: "Internal Server Error", details: error?.message ?? String(error) },
      { status: 500 }
    );
  }
}
