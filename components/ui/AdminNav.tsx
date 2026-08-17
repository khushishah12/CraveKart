"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Receipt, UserRound } from "lucide-react";

const TABS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: Receipt },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex max-w-full items-center gap-1 overflow-x-auto sm:gap-2"
      aria-label="Admin navigation"
    >
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-all duration-200 sm:px-4 sm:py-2 ${
              active
                ? "bg-primary-600 text-white shadow-soft"
                : "text-ink-600 hover:bg-white/70 hover:text-primary-600"
            }`}
          >
            <tab.icon className="size-4" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
