import { requireOwner } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";
import { GRANTABLE_PAGES } from "@/lib/admin-pages";
import PageHeader from "@/components/admin/dashboard/PageHeader";
import AccessManager, { type Seat } from "./AccessManager";

export const dynamic = "force-dynamic";

export default async function AccessPage() {
  const ctx = await requireOwner();

  const rows = await prisma.profiles.findMany({
    where: { OR: [{ role: "admin" }, { is_owner: true }] },
    select: { id: true, name: true, email: true, avatar: true, is_owner: true, admin_pages: true },
    orderBy: [{ is_owner: "desc" }, { created_at: "asc" }],
  });

  const seats: Seat[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    avatar: r.avatar,
    isOwner: r.is_owner,
    pages: r.admin_pages ?? [],
  }));

  const pages = GRANTABLE_PAGES.map((p) => ({ key: p.key, label: p.label, group: p.group, blurb: p.blurb ?? "" }));

  return (
    <div>
      <PageHeader title="Access" subtitle="Manage admin seats and what each person can see" />
      <AccessManager initialSeats={seats} pages={pages} selfId={ctx.userId} />
    </div>
  );
}
