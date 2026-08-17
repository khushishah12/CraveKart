import type { ReactNode } from "react";

export type BadgeTone = "brand" | "info" | "success" | "warning" | "danger" | "neutral";

const tones: Record<BadgeTone, string> = {
  brand: "bg-primary-50 text-primary-700",
  info: "bg-indigo-50 text-indigo-700",
  success: "bg-sage-50 text-sage-600",
  warning: "bg-amber-50 text-amber-600",
  danger: "bg-coral-50 text-coral-500",
  neutral: "bg-beige-100 text-ink-700",
};

export function Badge({
  tone = "neutral",
  dot = false,
  children,
  className = "",
}: {
  tone?: BadgeTone;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={`chip ${tones[tone]} ${className}`}>
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  );
}

export function statusTone(status: string): BadgeTone {
  switch (status) {
    case "delivered":
      return "success";
    case "on_the_way":
      return "brand";
    case "ready":
      return "info";
    case "preparing":
      return "info";
    case "pending":
      return "warning";
    case "cancelled":
      return "danger";
    default:
      return "neutral";
  }
}

export const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  preparing: "Preparing",
  ready: "Ready",
  on_the_way: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};
