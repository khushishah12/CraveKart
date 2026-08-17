"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ClipboardList,
  CookingPot,
  LayoutDashboard,
  Megaphone,
  MessageSquareText,
  Pizza,
  Store,
  Wallet,
} from "lucide-react";

const TABS = [
  { href: "/owner", label: "Dashboard", icon: LayoutDashboard },
  { href: "/owner/restaurant", label: "Restaurant", icon: Store },
  { href: "/owner/menu", label: "Menu", icon: Pizza },
  { href: "/owner/orders", label: "Orders", icon: ClipboardList },
  { href: "/owner/kitchen", label: "Kitchen", icon: CookingPot },
  { href: "/owner/reviews", label: "Reviews", icon: MessageSquareText },
  { href: "/owner/offers", label: "Offers", icon: Megaphone },
  { href: "/owner/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/owner/payments", label: "Payments", icon: Wallet },
];

export function OwnerNav() {
  const pathname = usePathname();

  return (
    <nav
      className="mt-6 inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-beige-200 bg-beige-100/80 p-1 shadow-soft"
      aria-label="Owner navigation"
    >
      {TABS.map((tab) => {
        const active = pathname === tab.href || (tab.href !== "/owner" && pathname.startsWith(tab.href));
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`focus-ring inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${
              active
                ? "bg-white text-ink-900 shadow-card"
                : "text-ink-500 hover:text-primary-600"
            }`}
          >
            <tab.icon className={`size-4 ${active ? "text-primary-600" : ""}`} />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
