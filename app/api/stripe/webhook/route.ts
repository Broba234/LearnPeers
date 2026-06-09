import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 });
  }

  let event: import("stripe").Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error("[webhook] Signature verification failed:", err.message);
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as import("stripe").Stripe.PaymentIntent;
        const sessionId = pi.metadata?.session_id;
        if (!sessionId) break;

        const { data: session } = await supabase
          .from("Sessions")
          .select("status, tutor_id, student_id")
          .eq("id", sessionId)
          .single();

        if (session && session.status === "pending") {
          await supabase
            .from("Sessions")
            .update({ status: "accepted" })
            .eq("id", sessionId);

          const tutor = await prisma.profiles.findUnique({ where: { id: session.tutor_id }, select: { name: true } });

          await createNotification(supabase, {
            userId: session.student_id,
            type: "session_accepted",
            title: "Session Confirmed",
            body: `Your payment was successful. ${tutor?.name ?? "Your tutor"} has been notified.`,
            sessionId,
            actorId: session.tutor_id,
          });
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const pi = event.data.object as import("stripe").Stripe.PaymentIntent;
        const sessionId = pi.metadata?.session_id;
        if (!sessionId) break;

        const { data: session } = await supabase
          .from("Sessions")
          .select("status, student_id, tutor_id")
          .eq("id", sessionId)
          .single();

        if (session && session.status === "pending") {
          await supabase
            .from("Sessions")
            .update({ status: "cancelled" })
            .eq("id", sessionId);

          await createNotification(supabase, {
            userId: session.student_id,
            type: "session_cancelled",
            title: "Payment Failed",
            body: "Your payment could not be processed. The session has been cancelled.",
            sessionId,
          });
        }
        break;
      }

      case "account.updated": {
        const account = event.data.object as import("stripe").Stripe.Account;
        // charges_enabled = tutor onboarding complete; update via Supabase
        // stripe_onboarding_complete is not a DB column — onboarding status is
        // checked live via the Stripe account object when needed.
        break;
      }
    }
  } catch (err: any) {
    console.error("[webhook] Handler error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
