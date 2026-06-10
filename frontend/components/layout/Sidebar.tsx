"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { directeurLinks } from "./sidebar/directeurLinks";
import { respedLinks } from "./sidebar/respedLinks";
import { adminLinks } from "./sidebar/adminLinks";
import { financierLinks } from "./sidebar/financierLinks";

type Role = "directeur" | "responsablePedagogique" | "admin" | "financier";

export default function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();

  const links =
    role === "responsablePedagogique"
      ? respedLinks
      : role === "admin"
        ? adminLinks
        : role === "financier"
          ? financierLinks
          : directeurLinks;

  const roleLabel =
    role === "responsablePedagogique"
      ? "Responsable Pédagogique"
      : role === "admin"
        ? "Administrateur"
        : role === "financier"
          ? "Responsable Financier"
          : "Directeur";

  return (
    <aside className="w-64 min-h-screen p-6 flex flex-col border-r border-border bg-sidebar-background transition-colors duration-300">
      {/* Logo / Role */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-foreground">MBICenter</h1>
        <p className="text-sm mt-1 text-muted-foreground">{roleLabel}</p>
      </div>

      {/* Nav links */}
      <nav className="space-y-1 flex-1">
        {links.map((item: any) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
