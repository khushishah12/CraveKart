"use client";

import { useState } from "react";
import { ArrowRight, PackageSearch, Route, Terminal } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { PageShell } from "@/components/ui/PageShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { RequireCustomer } from "@/components/ui/RequireCustomer";

const steps = [
  { n: "1", label: "Paste your tracking URL from the receipt email." },
  { n: "2", label: "We query our courier gateway to resolve the parcel." },
  { n: "3", label: "See live delivery status below, in real time." },
];

export default function TrackPage() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<{ target: string; status?: number; body?: string; error?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function lookUp() {
    setLoading(true);
    try {
      const r = await fetch(`/api/track?url=${encodeURIComponent(input)}`);
      const d = await r.json();
      setResult(d);
    } catch {
      setResult({ target: input, error: "Request failed." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <RequireCustomer>
    <PageShell backHref="/" backLabel="Go home" maxWidth="max-w-2xl" roleNav>
      <PageHeader
        icon={PackageSearch}
        title="Track your order"
        subtitle="Paste your tracking URL and our courier gateway will look it up for you."
      />

      <div className="card card-pad mt-8">
        <label htmlFor="track-url" className="text-sm font-semibold text-ink-800">
          Tracking URL
        </label>
        <div className="relative mt-2">
          <Route className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-400" />
          <input
            id="track-url"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && lookUp()}
            placeholder="https://track.cravekart.app/ABC123"
            className="focus-ring input-base h-12 rounded-full pl-12 pr-4"
          />
        </div>
        <Button className="mt-4 w-full" size="lg" loading={loading} onClick={lookUp}>
          Track now <ArrowRight className="size-4" />
        </Button>
      </div>

      <ol className="mt-6 grid gap-3 sm:grid-cols-3">
        {steps.map((s) => (
          <li key={s.n} className="card flex items-start gap-3 p-4">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-50 text-xs font-bold text-primary-600">
              {s.n}
            </span>
            <p className="text-[13px] leading-relaxed text-ink-500">{s.label}</p>
          </li>
        ))}
      </ol>

      {result && (
        <div className="mt-6 overflow-hidden rounded-3xl border border-beige-200 bg-ink-900 shadow-card">
          <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
            <Terminal className="size-4 text-primary-400" />
            <p className="truncate text-xs font-semibold text-cream/80">
              {result.target}
            </p>
            {result.status && (
              <span
                className={`ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                  (result.status ?? 0) >= 400
                    ? "bg-coral-500/20 text-coral-400"
                    : "bg-sage-500/20 text-sage-400"
                }`}
              >
                {result.status}
              </span>
            )}
          </div>
          <pre className="max-h-80 overflow-auto p-5 text-xs leading-relaxed text-cream/90">
{JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </PageShell>
    </RequireCustomer>
  );
}
