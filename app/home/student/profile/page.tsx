import { redirect } from "next/navigation";

// Profile now lives inside Settings → Profile. Keep this route as a redirect so
// existing links and bookmarks continue to resolve.
export default function StudentProfileRedirect() {
  redirect("/home/student/settings?tab=profile");
}
