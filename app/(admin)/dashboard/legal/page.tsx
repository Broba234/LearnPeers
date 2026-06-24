import { requireAdminPage } from "@/lib/admin-access";
import PageHeader from "@/components/admin/dashboard/PageHeader";
import LegalManager from "./LegalManager";

export const dynamic = "force-dynamic";

export default async function LegalPage() {
  await requireAdminPage("legal");
  return (
    <div>
      <PageHeader
        title="Legal"
        subtitle="Publish Terms of Service versions and review who has accepted them"
      />
      <LegalManager />
    </div>
  );
}
