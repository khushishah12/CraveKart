"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Copy, LogOut, Shield } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { AUTH_EVENT, getCurrentUser, type UserProfile } from "@/lib/cart";
import { Badge } from "@/components/ui/Badge";

function initials(name: string | null | undefined): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "U";
}

export function UserMenu() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(() => getCurrentUser());
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sync = () => setUser(getCurrentUser());
    window.addEventListener(AUTH_EVENT, sync);
    return () => window.removeEventListener(AUTH_EVENT, sync);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut().catch(() => null);
    localStorage.removeItem("foodrush_user");
    localStorage.removeItem("foodrush_access_token");
    localStorage.removeItem("foodrush_auth_id");
    window.dispatchEvent(new Event(AUTH_EVENT));
    router.push("/login");
    router.refresh();
  }

  async function copyId() {
    if (!userId) return;
    await navigator.clipboard.writeText(userId).catch(() => null);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="focus-ring rounded-full px-4 py-2 text-sm font-semibold text-ink-700 transition-colors hover:text-primary-600"
      >
        Sign in
      </Link>
    );
  }

  // Prefer the real auth user id; fall back to the profile id.
  const authId =
    typeof window !== "undefined" ? localStorage.getItem("foodrush_auth_id") : null;
  const userId = authId || user.id;
  const shortId = userId ? userId.slice(0, 8) : null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="focus-ring flex items-center gap-2 rounded-full border border-beige-200 bg-white py-1 pl-1 pr-3 text-sm font-semibold text-ink-800 shadow-soft transition-all duration-150 hover:border-primary-300 hover:shadow-card active:scale-95"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-[13px] font-bold text-white ring-2 ring-primary-100">
          {initials(user.name ?? user.email)}
        </span>
        <span className="hidden max-w-28 truncate sm:inline">
          {user.name ?? user.email}
        </span>
        <span className="hidden font-mono text-[11px] text-ink-400 md:inline">
          #{shortId}
        </span>
        <ChevronDown
          className={`size-3.5 text-ink-400 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="animate-scale-in absolute right-0 top-full z-30 mt-2 w-72 origin-top-right overflow-hidden rounded-2xl border border-beige-200 bg-white p-2 shadow-pop">
          <div className="rounded-xl bg-beige-100/70 px-4 py-3">
            <p className="truncate font-bold text-ink-900">
              {user.name ?? "CraveKart member"}
            </p>
            <p className="truncate text-sm text-ink-500">{user.email}</p>
            <div className="mt-2">
              <Badge tone={user.role === "admin" ? "brand" : "neutral"}>
                {user.role ?? "member"}
              </Badge>
            </div>
          </div>
          {userId && (
            <div className="mt-1 flex items-center gap-2 px-3 py-2">
              <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                User ID
              </span>
              <code className="min-w-0 flex-1 truncate rounded-lg bg-cream px-2 py-1 font-mono text-xs text-ink-700">
                {userId}
              </code>
              <button
                onClick={copyId}
                className="focus-ring grid size-7 shrink-0 place-items-center rounded-lg text-ink-500 transition-colors hover:bg-beige-100 hover:text-primary-600"
                aria-label="Copy user id"
              >
                {copied ? (
                  <Check className="size-4 text-sage-500" />
                ) : (
                  <Copy className="size-4" />
                )}
              </button>
            </div>
          )}
          {/* VULN (A01): the "Admin" nav link is hidden for non-admins via a
              CLIENT-SIDE check of profile.role (localStorage). The /admin
              route itself does no server-side verification. */}
          {user.role === "admin" && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="focus-ring mt-1 flex w-full items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:bg-beige-100 hover:text-primary-600"
            >
              <Shield className="size-4" />
              Admin dashboard
            </Link>
          )}
          {user.role === "restaurant_owner" && (
            <Link
              href="/owner"
              onClick={() => setOpen(false)}
              className="focus-ring mt-1 flex w-full items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:bg-beige-100 hover:text-primary-600"
            >
              <Shield className="size-4" />
              Restaurant dashboard
            </Link>
          )}
          <button
            onClick={signOut}
            className="focus-ring mt-1 flex w-full items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-coral-500 transition-colors hover:bg-coral-400/10"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
