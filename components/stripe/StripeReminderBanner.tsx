"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

// Persistent nag shown to tutors who finished onboarding but skipped Stripe
// ("I'll do it later"). Stays put on the Earnings and Courses pages until the
// account is actually connected — payouts are locked until then.
export default function StripeReminderBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.email) return;
      try {
        const res = await fetch(
          `/api/stripe/connect/status?email=${encodeURIComponent(user.email)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        setShow(!data.onboardingComplete);
      } catch {
        // Silent — a missing nag is better than a broken page.
      }
    })();
  }, []);

  if (!show) return null;

  return (
    <div className="mb-6 flex items-start gap-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
      <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
        <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-900">
          Connect Stripe to get paid
        </p>
        <p className="text-sm text-amber-800 mt-0.5">
          You can tutor right now, but your payouts stay locked until you finish
          connecting Stripe. It only takes a couple of minutes.
        </p>
      </div>
      <Link
        href="/home/tutor/profile"
        className="flex-shrink-0 px-4 py-2 bg-amber-500 text-white text-sm font-semibold rounded-xl hover:bg-amber-600 transition-colors"
      >
        Connect Stripe
      </Link>
    </div>
  );
}
