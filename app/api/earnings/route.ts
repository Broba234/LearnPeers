import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const TUTOR_NET_PERCENT = 0.95;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tutorId = searchParams.get("tutorId");

  if (!tutorId) {
    return NextResponse.json({ error: "tutorId required" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

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
    (sum, s) => sum + Math.round((Number(s.amount) * TUTOR_NET_PERCENT) * 100) / 100,
    0
  );
  const totalPending = pendingSessions.reduce(
    (sum, s) => sum + Math.round((Number(s.amount) * TUTOR_NET_PERCENT) * 100) / 100,
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
      const usdAvailable = balance.available.find((b) => b.currency === "usd");
      const usdPending = balance.pending.find((b) => b.currency === "usd");
      stripeAvailable = (usdAvailable?.amount ?? 0) / 100;
      stripePending = (usdPending?.amount ?? 0) / 100;
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
