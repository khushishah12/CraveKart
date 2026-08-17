import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

import { Logo } from "@/components/ui/Logo";

export function PageShell({
  children,
  maxWidth = "max-w-4xl",
  backHref = "/",
  backLabel = "Go back",
  nav,
  right,
  stickyHeader = true,
}: {
  children: ReactNode;
  maxWidth?: string;
  backHref?: string;
  backLabel?: string;
  nav?: ReactNode;
  right?: ReactNode;
  stickyHeader?: boolean;
}) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-cream via-beige-100 to-primary-100" />
      <div className="animate-blob absolute -right-24 top-0 size-96 rounded-full bg-primary-200/50 blur-3xl" />
      <div className="animate-blob absolute -left-24 top-1/2 size-80 rounded-full bg-coral-400/10 blur-3xl [animation-delay:-8s]" />

      <header
        className={`relative z-30 border-b border-white/50 ${
          stickyHeader ? "sticky top-0" : ""
        }`}
      >
        <div className="glass mx-auto w-full max-w-6xl px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex min-w-0 shrink-0 items-center gap-3">
              <Link
                href={backHref}
                aria-label={backLabel}
                className="focus-ring grid size-9 shrink-0 place-items-center rounded-full border border-beige-200 bg-white/80 text-ink-700 shadow-soft transition-all duration-200 hover:border-primary-300 hover:text-primary-600 active:scale-95"
              >
                <ArrowLeft className="size-4" />
              </Link>
              <Link href="/" aria-label="CraveKart home" className="focus-ring rounded-xl">
                <Logo size="md" />
              </Link>
            </div>
            {nav && (
              <div className="flex min-w-0 flex-1 justify-center overflow-x-auto">
                {nav}
              </div>
            )}
            {right && (
              <nav className="flex shrink-0 items-center gap-2.5">{right}</nav>
            )}
          </div>
        </div>
      </header>

      <main
        className={`relative z-10 mx-auto w-full ${maxWidth} flex-1 px-4 pb-24 sm:px-6 sm:pb-16`}
      >
        {children}
      </main>
    </div>
  );
}
