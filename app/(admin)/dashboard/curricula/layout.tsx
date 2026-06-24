import { requireAdminPage } from "@/lib/admin-access";

export default async function CurriculaGuard({ children }: { children: React.ReactNode }) {
  await requireAdminPage("curricula");
  return <>{children}</>;
}
