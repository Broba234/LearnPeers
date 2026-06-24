import { requireAdminPage } from "@/lib/admin-access";

export default async function ContactsGuard({ children }: { children: React.ReactNode }) {
  await requireAdminPage("contacts");
  return <>{children}</>;
}
