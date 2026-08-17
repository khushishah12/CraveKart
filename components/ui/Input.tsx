import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
  icon?: ReactNode;
};

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ className = "", invalid, icon, ...rest }, ref) => {
    return (
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          suppressHydrationWarning
          className={`focus-ring h-11 w-full rounded-xl border bg-surface-soft px-4 text-[15px] text-ink-900 shadow-soft placeholder:text-ink-400 transition-all duration-200 hover:border-beige-300 focus:border-primary-400 focus:bg-surface ${
            icon ? "pl-11" : ""
          } ${
            invalid
              ? "border-coral-500 focus:border-coral-500"
              : "border-beige-200"
          } ${className}`}
          {...rest}
        />
      </div>
    );
  }
);
Input.displayName = "Input";
