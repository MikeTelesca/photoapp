import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant =
  | "primary"   // filled, inverted surface — main CTA
  | "secondary" // border only — secondary action
  | "ghost"     // no border/bg — tertiary / link-like
  | "approve"   // filled emerald — explicit "approve"
  | "danger"    // filled red — explicit "delete/reject"
  | "outline"   // legacy alias for "secondary"
  | "text";     // legacy alias for "ghost"

type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-graphite-900 dark:bg-white text-white dark:text-graphite-900 hover:bg-graphite-800 dark:hover:bg-graphite-100",
  secondary:
    "bg-white dark:bg-graphite-900 text-graphite-900 dark:text-white border border-graphite-200 dark:border-graphite-800 hover:bg-graphite-50 dark:hover:bg-graphite-800",
  ghost:
    "bg-transparent text-graphite-600 dark:text-graphite-300 hover:bg-graphite-100 dark:hover:bg-graphite-800 hover:text-graphite-900 dark:hover:text-white",
  approve:
    "bg-emerald-600 text-white hover:bg-emerald-700",
  danger:
    "bg-red-600 text-white hover:bg-red-700",
  outline:
    "bg-white dark:bg-graphite-900 text-graphite-900 dark:text-white border border-graphite-200 dark:border-graphite-800 hover:bg-graphite-50 dark:hover:bg-graphite-800",
  text:
    "bg-transparent text-graphite-600 dark:text-graphite-300 hover:bg-graphite-100 dark:hover:bg-graphite-800 hover:text-graphite-900 dark:hover:text-white",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs rounded-md",
  md: "h-9 px-4 text-sm rounded-md",
  lg: "h-10 px-5 text-sm rounded-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center gap-1.5 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-graphite-950 ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
