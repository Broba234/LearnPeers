import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/admin-access";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import React from "react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getAdminContext();

  if (!ctx) {
    redirect("/admin/login");
  }

  const allowedPages = Array.from(ctx.allowedPages);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 lg:flex">
      <AppSidebar allowedPages={allowedPages} />
      <div className="flex-1 min-w-0 lg:ml-64">
        <AppHeader
          name={ctx.name}
          email={ctx.email}
          avatar={ctx.avatar}
          isOwner={ctx.isOwner}
        />
        <div className="p-4 md:p-6 max-w-[1600px] mx-auto">{children}</div>
      </div>
    </div>
  );
}
