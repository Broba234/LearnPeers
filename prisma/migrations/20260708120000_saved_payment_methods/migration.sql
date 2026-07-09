-- Saved payment methods for one-tap booking.
--
-- The production DB already gained Profiles.stripe_customer_id and
-- Sessions.payment_intent_id outside a migration (instant-session feature was
-- shipped without one); the IF NOT EXISTS guards make this replayable there
-- while still creating the columns on a fresh database.
ALTER TABLE "public"."Profiles" ADD COLUMN IF NOT EXISTS "stripe_customer_id" TEXT;
ALTER TABLE "public"."Sessions" ADD COLUMN IF NOT EXISTS "payment_intent_id" TEXT;

CREATE TABLE IF NOT EXISTS "public"."StudentPaymentMethods" (
    "id" TEXT NOT NULL,
    "profile_id" UUID NOT NULL,
    "brand" TEXT NOT NULL,
    "last4" TEXT NOT NULL,
    "exp_month" INTEGER NOT NULL,
    "exp_year" INTEGER NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "StudentPaymentMethods_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "StudentPaymentMethods_profile_id_fkey" FOREIGN KEY ("profile_id")
        REFERENCES "public"."Profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX IF NOT EXISTS "StudentPaymentMethods_profile_id_idx"
    ON "public"."StudentPaymentMethods"("profile_id");

-- RLS on with no policies, like the other app tables: only the service role /
-- direct connections (API routes, Prisma) can read card data — Supabase
-- PostgREST clients get nothing.
ALTER TABLE "public"."StudentPaymentMethods" ENABLE ROW LEVEL SECURITY;
