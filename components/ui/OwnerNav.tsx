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
      className="flex items-center gap-0.5"
      aria-label="Owner navigation"
    >
      {TABS.map((tab) => {
        const active = pathname === tab.href || (tab.href !== "/owner" && pathname.startsWith(tab.href));
        return (
          <Link
            key={tab.href}
            href={tab.href}
            title={tab.label}
            aria-label={tab.label}
            aria-current={active ? "page" : undefined}
            className={`focus-ring inline-flex size-8 shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
              active
                ? "bg-primary-600 text-white shadow-soft"
                : "text-ink-500 hover:bg-white/70 hover:text-primary-600"
            }`}
          >
            <tab.icon className={`size-4 ${active ? "" : ""}`} />
          </Link>
        );
      })}
    </nav>
  );
}
