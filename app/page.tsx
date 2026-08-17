"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  Bike,
  Flame,
  Receipt,
  ShieldCheck,
  Star,
  Timer,
} from "lucide-react";

import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { useIsAdmin, useIsRestaurantOwner, useCurrentUser } from "@/lib/auth";

const UserMenu = dynamic(
  () => import("@/components/ui/UserMenu").then((m) => m.UserMenu),
  { ssr: false }
);

const RoleNav = dynamic(
  () => import("@/components/ui/RoleNav").then((m) => m.RoleNav),
  { ssr: false }
);

const trust = [
  { icon: Timer, label: "30-min delivery" },
  { icon: ShieldCheck, label: "Secure checkout" },
  { icon: Star, label: "4.8 avg. rating" },
  { icon: Bike, label: "Live tracking" },
];

export default function HomePage() {
  const isAdmin = useIsAdmin();
  const isOwner = useIsRestaurantOwner();
  const profile = useCurrentUser();
  const isLoggedIn = !!profile;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-cream via-beige-100 to-primary-100" />
      <div className="animate-blob absolute -left-32 top-10 size-96 rounded-full bg-primary-200/60 blur-3xl" />
      <div className="animate-blob absolute -right-24 top-1/3 size-80 rounded-full bg-coral-400/20 blur-3xl [animation-delay:-7s]" />
      <div className="absolute bottom-0 left-1/2 h-64 w-[70rem] max-w-full -translate-x-1/2 rounded-full bg-white/40 blur-3xl" />

      <header className="relative z-10 mx-auto w-full max-w-6xl px-4 py-5 sm:px-6">
        <div className="flex items-center gap-4">
          <Logo size="lg" />
          {isLoggedIn && (
            <div className="flex min-w-0 flex-1 justify-center overflow-x-auto">
              <RoleNav />
            </div>
          )}
          <nav className="ml-auto flex shrink-0 items-center gap-2.5">
            {!isLoggedIn && (
              <>
                <Link
                  href="/login"
                  className="focus-ring rounded-full px-4 py-2 text-sm font-semibold text-ink-700 transition-colors hover:text-primary-600"
                >
                  Sign in
                </Link>
                <Link href="/register">
                  <Button size="sm">Get started</Button>
                </Link>
              </>
            )}
            <UserMenu />
          </nav>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 pb-20 text-center sm:px-6">
        {isAdmin ? (
          <>
            <span className="glass inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-semibold text-ink-700">
              <Flame className="size-3.5 text-primary-600" />
              Admin console
            </span>
            <h1 className="mt-6 max-w-2xl text-5xl font-extrabold leading-[1.06] tracking-tight text-ink-900 sm:text-6xl">
              Manage your{" "}
              <span className="bg-gradient-to-r from-primary-600 to-coral-500 bg-clip-text text-transparent">
                CraveKart
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-ink-500">
              Oversee users, track orders, and keep the kitchen humming — all
              from the admin dashboard.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link href="/admin">
                <Button size="lg">
                  Open dashboard <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link href="/admin/orders">
                <Button size="lg" variant="secondary">
                  View orders <Receipt className="size-4" />
                </Button>
              </Link>
            </div>
            <footer className="mt-16 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-ink-500">
              <Link href="/admin" className="transition-colors hover:text-primary-600">
                Dashboard
              </Link>
              <Link href="/admin/orders" className="transition-colors hover:text-primary-600">
                Orders
              </Link>
              <Link href="/profile" className="transition-colors hover:text-primary-600">
                Profile
              </Link>
            </footer>
          </>
        ) : isOwner ? (
          <>
            <span className="glass inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-semibold text-ink-700">
              <Flame className="size-3.5 text-primary-600" />
              Restaurant dashboard
            </span>
            <h1 className="mt-6 max-w-2xl text-5xl font-extrabold leading-[1.06] tracking-tight text-ink-900 sm:text-6xl">
              Manage your{" "}
              <span className="bg-gradient-to-r from-primary-600 to-coral-500 bg-clip-text text-transparent">
                restaurant
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-ink-500">
              Accept orders, manage your menu, track revenue, and engage with
              customers — all from your restaurant dashboard.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link href="/owner">
                <Button size="lg">
                  Open dashboard <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link href="/owner/orders">
                <Button size="lg" variant="secondary">
                  View orders <Receipt className="size-4" />
                </Button>
              </Link>
            </div>
            <footer className="mt-16 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-ink-500">
              <Link href="/owner" className="transition-colors hover:text-primary-600">
                Dashboard
              </Link>
              <Link href="/owner/orders" className="transition-colors hover:text-primary-600">
                Orders
              </Link>
              <Link href="/owner/menu" className="transition-colors hover:text-primary-600">
                Menu
              </Link>
              <Link href="/profile" className="transition-colors hover:text-primary-600">
                Profile
              </Link>
            </footer>
          </>
        ) : (
          <>
            <span className="glass inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-semibold text-ink-700">
              <Flame className="size-3.5 text-primary-600" />
              Hot food, delivered in 30 minutes
            </span>
            <h1 className="mt-6 max-w-2xl text-5xl font-extrabold leading-[1.06] tracking-tight text-ink-900 sm:text-6xl">
              Your cravings,{" "}
              <span className="bg-gradient-to-r from-primary-600 to-coral-500 bg-clip-text text-transparent">
                one tap away
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-ink-500">
              CraveKart connects you with the best restaurants nearby — from
              sizzling burgers to soul-warming bowls.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link href="/menu">
                <Button size="lg">
                  Order now <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="secondary">
                  Sign in
                </Button>
              </Link>
            </div>

            <div className="glass mt-14 grid max-w-2xl grid-cols-2 gap-y-4 rounded-3xl px-6 py-5 shadow-card sm:grid-cols-4">
              {trust.map((t) => (
                <div key={t.label} className="flex flex-col items-center gap-1.5 text-center">
                  <t.icon className="size-5 text-primary-600" />
                  <span className="text-[13px] font-semibold text-ink-700">
                    {t.label}
                  </span>
                </div>
              ))}
            </div>

            <footer className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-ink-500">
              <Link href="/menu" className="transition-colors hover:text-primary-600">
                Menu
              </Link>
              <Link href="/orders" className="transition-colors hover:text-primary-600">
                Orders
              </Link>
              <Link href="/track" className="transition-colors hover:text-primary-600">
                Track
              </Link>
              <Link href="/profile" className="transition-colors hover:text-primary-600">
                Profile
              </Link>
              <Link href="/cart" className="transition-colors hover:text-primary-600">
                Cart
              </Link>
            </footer>
          </>
        )}
      </main>
    </div>
  );
}
