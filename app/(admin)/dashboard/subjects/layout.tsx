import { requireAdminPage } from "@/lib/admin-access";

export default async function SubjectsGuard({ children }: { children: React.ReactNode }) {
  await requireAdminPage("subjects");
  return <>{children}</>;
}
