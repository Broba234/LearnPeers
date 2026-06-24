import { requireAdminPage } from "@/lib/admin-access";
import UsersTable from "./UsersTable";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  await requireAdminPage("users");
  return <UsersTable />;
}
