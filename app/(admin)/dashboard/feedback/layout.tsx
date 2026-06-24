import { requireAdminPage } from "@/lib/admin-access";

export default async function FeedbackGuard({ children }: { children: React.ReactNode }) {
  await requireAdminPage("feedback");
  return <>{children}</>;
}
