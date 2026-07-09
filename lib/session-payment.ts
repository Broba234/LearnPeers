import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { createNotification, notifySessionCreated } from "@/lib/notifications";

/**
 * Payment for a booking succeeded → make the session real.
 *
 * Bookings are created as `awaiting_payment`, a draft state the tutor never
 * sees (listing routes filter it out) and that triggers no notification. This
 * flips the draft to `accepted`, records the PaymentIntent, and ONLY THEN
 * tells the tutor a request exists — the fix for tutors being notified before
 * any payment happened.
 *
 * Called from both the Stripe webhook (source of truth) and the client's
 * confirm-payment accelerator. The status-guarded UPDATE is the idempotency
 * gate: whichever caller flips the row sends the notifications; the loser
 * matches zero rows and no-ops, so the tutor is never double-notified.
 *
 * `pending` is included in the guard only for sessions created by the
 * pre-draft flow that were still mid-checkout when this shipped.
 */
export async function finalizePaidSession(
  supabase: SupabaseClient,
  pi: Stripe.PaymentIntent
): Promise<{ finalized: boolean }> {
  const sessionId = pi.metadata?.session_id;
  if (!sessionId) return { finalized: false };

  const { data: flipped } = await supabase
    .from("Sessions")
    .update({ status: "accepted", payment_intent_id: pi.id })
    .eq("id", sessionId)
    .in("status", ["awaiting_payment", "pending"])
    .select("id, tutor_id, student_id, topic")
    .maybeSingle();

  if (!flipped) return { finalized: false };

  // Notifications are best-effort: the session is already accepted and paid,
  // so a notification hiccup must not bubble up as a payment failure.
  try {
    const [student, tutor] = await Promise.all([
      prisma.profiles.findUnique({
        where: { id: flipped.student_id },
        select: { name: true },
      }),
      prisma.profiles.findUnique({
        where: { id: flipped.tutor_id },
        select: { name: true },
      }),
    ]);

    await notifySessionCreated(supabase, {
      tutorId: flipped.tutor_id,
      studentId: flipped.student_id,
      studentName: student?.name || "A student",
      topic: flipped.topic || undefined,
      sessionId: flipped.id,
    });

    await createNotification(supabase, {
      userId: flipped.student_id,
      type: "session_accepted",
      title: "Session Confirmed",
      body: `Your payment was successful. ${tutor?.name ?? "Your tutor"} has been notified.`,
      sessionId: flipped.id,
      actorId: flipped.tutor_id,
    });
  } catch (e) {
    console.error("[session-payment] post-payment notifications failed:", e);
  }

  return { finalized: true };
}
