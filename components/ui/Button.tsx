import { Loader2 } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "dark" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-primary-500 to-primary-600 text-white shadow-glow hover:from-primary-400 hover:to-primary-500 active:scale-[0.97]",
  secondary:
    "bg-white text-ink-800 border border-beige-200 shadow-soft hover:border-primary-300 hover:bg-primary-50/70 hover:text-primary-700 active:scale-[0.97]",
  ghost: "bg-transparent text-ink-700 hover:bg-beige-100 hover:text-ink-900 active:scale-[0.97]",
  dark: "bg-ink-900 text-cream shadow-soft hover:bg-ink-800 active:scale-[0.97]",
  danger:
    "bg-white text-coral-600 border border-coral-200 shadow-soft hover:bg-coral-400/10 hover:border-coral-300 active:scale-[0.97]",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm gap-1.5 rounded-full",
  md: "h-11 px-6 text-sm gap-2 rounded-full",
  lg: "h-12 px-7 text-base gap-2 rounded-full",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = "primary", size = "md", loading, className = "", disabled, children, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        suppressHydrationWarning
        className={`focus-ring inline-flex select-none items-center justify-center font-semibold transition-all duration-200 will-change-transform disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${sizes[size]} ${className}`}
        {...rest}
      >
        {loading && <Loader2 className="size-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
