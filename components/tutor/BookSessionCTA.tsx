"use client";

import { useRouter } from "next/navigation";

/**
 * "Book a session" on the public tutor profile. Guests hit the auth wall on
 * the way to explore, so the pick is stashed in localStorage first — the
 * register page shows it and explore re-opens this tutor after signup.
 */
export const PENDING_TUTOR_KEY = "lp_pending_tutor";

export default function BookSessionCTA({
  tutorId,
  tutorName,
}: {
  tutorId: string;
  tutorName: string;
}) {
  const router = useRouter();

  const handleClick = () => {
    try {
      localStorage.setItem(
        PENDING_TUTOR_KEY,
        JSON.stringify({ id: tutorId, name: tutorName })
      );
    } catch {
      /* storage unavailable — the URL param still covers logged-in users */
    }
    router.push(`/home/student/explore?tutor=${tutorId}`);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex-1 rounded-xl bg-brand-600 py-3 text-center text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.99]"
    >
      Book a session
    </button>
  );
}
