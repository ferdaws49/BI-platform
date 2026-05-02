"use client";

import Sidebar from "@/components/layout/Sidebar";
import AdminHeader from "@/components/layout/AdminHeader";
import { usePathname } from "next/navigation";
import { AdminProvider, useAdminContext } from "./AdminContext";

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useAdminContext();

  const getMeta = () => {
    switch (pathname) {
      case "/admin/dashboard":
        return t.pages.dashboard;
      case "/admin/users":
        return t.pages.users;
      case "/admin/learners":
        return t.pages.learners;
      case "/admin/resources":
        return t.pages.resources;
      case "/admin/import":
        return t.pages.import;
      case "/admin/settings":
        return t.pages.settings;
      default:
        return {
          title: "Admin",
          subtitle: "Espace administrateur",
        };
    }
  };

  const meta = getMeta();

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans transition-colors duration-300">
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col">
        <AdminHeader 
          title={meta.title} 
          subtitle={meta.subtitle} 
          adminRole={t.dashboard.welcome}
        />
        <main className="p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminProvider>
      <LayoutContent>{children}</LayoutContent>
    </AdminProvider>
  );
}