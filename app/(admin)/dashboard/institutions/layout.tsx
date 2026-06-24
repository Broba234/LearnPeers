import { requireAdminPage } from "@/lib/admin-access";

export default async function InstitutionsGuard({ children }: { children: React.ReactNode }) {
  await requireAdminPage("institutions");
  return <>{children}</>;
}
