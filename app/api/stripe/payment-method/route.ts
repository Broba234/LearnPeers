import { stripe } from "@/lib/stripe";
import { getAuthedUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import {
  listSavedCards,
  upsertSavedPaymentMethod,
  toSavedCard,
} from "@/lib/payment-methods";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * The student's saved cards. All handlers derive identity from the session
 * (getAuthedUser) and verify card ownership against StudentPaymentMethods
 * before touching Stripe — a pm_… id in the body is never trusted on its own.
 */

/** List saved cards for the settings UI / booking modal (no Stripe call). */
export async function GET() {
  try {
    const user = await getAuthedUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const cards = await listSavedCards(user.id);
    return NextResponse.json({ cards });
  } catch (e) {
    console.error("[payment-method GET] error:", e);
    return NextResponse.json({ cards: [] });
  }
}

/**
 * Persist a card the student just saved with a SetupIntent. Verifies the
 * PaymentMethod is attached to THIS student's Stripe Customer, then mirrors
 * its display info. First card becomes the default automatically.
 */
export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
    }
    const user = await getAuthedUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { paymentMethodId, makeDefault } = await request.json();
    if (typeof paymentMethodId !== "string" || !/^pm_[A-Za-z0-9]+$/.test(paymentMethodId)) {
      return NextResponse.json({ error: "Valid paymentMethodId is required" }, { status: 400 });
    }

    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: { stripe_customer_id: true },
    });
    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ error: "No payment profile" }, { status: 400 });
    }

    const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
    const pmCustomer = typeof pm.customer === "string" ? pm.customer : pm.customer?.id;
    if (pmCustomer !== profile.stripe_customer_id) {
      return NextResponse.json({ error: "Not your payment method" }, { status: 403 });
    }
    if (!pm.card) {
      return NextResponse.json({ error: "Only cards are supported" }, { status: 400 });
    }

    const card = await upsertSavedPaymentMethod(user.id, pm, {
      makeDefault: makeDefault === true,
    });
    return NextResponse.json({ card });
  } catch (e) {
    console.error("[payment-method POST] error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** Make one of the student's saved cards the default. */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthedUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const { paymentMethodId } = await request.json();
    const row = await prisma.studentPaymentMethods.findFirst({
      where: { id: String(paymentMethodId || ""), profile_id: user.id },
    });
    if (!row) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    const [, updated] = await prisma.$transaction([
      prisma.studentPaymentMethods.updateMany({
        where: { profile_id: user.id, is_default: true },
        data: { is_default: false },
      }),
      prisma.studentPaymentMethods.update({
        where: { id: row.id },
        data: { is_default: true },
      }),
    ]);
    return NextResponse.json({ card: toSavedCard(updated) });
  } catch (e) {
    console.error("[payment-method PATCH] error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * Remove a saved card: detach it in Stripe and drop the mirror row. If it was
 * the default, the most recently added remaining card is promoted.
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthedUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const { paymentMethodId } = await request.json().catch(() => ({}));
    const row = await prisma.studentPaymentMethods.findFirst({
      where: { id: String(paymentMethodId || ""), profile_id: user.id },
    });
    if (!row) {
      return NextResponse.json({ success: true }); // already gone — idempotent
    }

    if (stripe) {
      try {
        await stripe.paymentMethods.detach(row.id);
      } catch (e) {
        // Already detached in Stripe — still remove our mirror row.
        console.warn("[payment-method DELETE] detach failed:", e);
      }
    }
    await prisma.studentPaymentMethods.delete({ where: { id: row.id } });

    if (row.is_default) {
      const next = await prisma.studentPaymentMethods.findFirst({
        where: { profile_id: user.id },
        orderBy: { created_at: "desc" },
      });
      if (next) {
        await prisma.studentPaymentMethods.update({
          where: { id: next.id },
          data: { is_default: true },
        });
      }
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[payment-method DELETE] error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
