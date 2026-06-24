import { redirect } from "next/navigation";

// Profile now lives inside Settings → Profile. Keep this route as a redirect so
// existing links and bookmarks (e.g. the payout-reminder banner) continue to
// resolve to the right place.
export default function TutorProfileRedirect() {
  redirect("/home/tutor/settings?tab=profile");
}
