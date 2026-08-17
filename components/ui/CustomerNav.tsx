"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  LayoutDashboard,
  MapPin,
  ShoppingBag,
  ShoppingCart,
} from "lucide-react";

const TABS = [
  { href: "/menu", label: "Menu", icon: LayoutDashboard },
  { href: "/orders", label: "Orders", icon: ClipboardList },
  { href: "/cart", label: "Cart", icon: ShoppingCart },
  { href: "/track", label: "Track", icon: MapPin },
  { href: "/profile", label: "Profile", icon: ShoppingBag },
];

export function CustomerNav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex items-center gap-0.5"
      aria-label="Customer navigation"
    >
      {TABS.map((tab) => {
        const active =
          pathname === tab.href ||
          (tab.href !== "/menu" && tab.href !== "/cart" && tab.href !== "/track" && pathname.startsWith(tab.href));
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`focus-ring inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-all duration-200 sm:px-3 sm:text-sm ${
              active
                ? "bg-primary-600 text-white shadow-soft"
                : "text-ink-600 hover:bg-white/70 hover:text-primary-600"
            }`}
          >
            <tab.icon className="size-3.5 sm:size-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
