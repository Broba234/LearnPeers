import { requireAdminPage } from "@/lib/admin-access";

export default async function ApprovalsGuard({ children }: { children: React.ReactNode }) {
  await requireAdminPage("approvals");
  return <>{children}</>;
}
