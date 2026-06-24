import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { tutorNet } from "@/lib/billing";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tutorId = searchParams.get("tutorId");

  if (!tutorId) {
    return NextResponse.json({ error: "tutorId required" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  const { data: sessions, error } = await supabase
    .from("Sessions")
    .select(`
      id,
      status,
      amount,
      topic,
      duration,
      date,
      created_at,
      student:student_id (
        id,
        name,
        avatar
      )
    `)
    .eq("tutor_id", tutorId)
    .in("status", ["completed", "accepted", "in_progress"])
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const completedSessions = (sessions ?? []).filter((s) => s.status === "completed");
  const pendingSessions = (sessions ?? []).filter(
    (s) => s.status === "accepted" || s.status === "in_progress"
  );

  const totalEarned = completedSessions.reduce(
    (sum, s) => sum + tutorNet(Number(s.amount)),
    0
  );
  const totalPending = pendingSessions.reduce(
    (sum, s) => sum + tutorNet(Number(s.amount)),
    0
  );

  // Stripe balance from the tutor's connected account
  let stripeAvailable = 0;
  let stripePending = 0;
  let loginUrl: string | null = null;

  const profile = await prisma.profiles.findUnique({
    where: { id: tutorId },
    select: { stripe_account_id: true },
  });

  if (stripe && profile?.stripe_account_id) {
    try {
      const balance = await stripe.balance.retrieve({
        stripeAccount: profile.stripe_account_id,
      });
      const cadAvailable = balance.available.find((b) => b.currency === "cad");
      const cadPending = balance.pending.find((b) => b.currency === "cad");
      stripeAvailable = (cadAvailable?.amount ?? 0) / 100;
      stripePending = (cadPending?.amount ?? 0) / 100;
    } catch {
      // Stripe not fully onboarded — silently skip
    }

    try {
      const link = await stripe.accounts.createLoginLink(profile.stripe_account_id);
      loginUrl = link.url;
    } catch {
      // Express dashboard not available in test mode with sandbox accounts
    }
  }

  return NextResponse.json({
    totalEarned,
    totalPending,
    stripeAvailable,
    stripePending,
    loginUrl,
    sessions: sessions ?? [],
  });
}
