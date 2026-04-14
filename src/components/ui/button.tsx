import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "outline" | "text" | "approve" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-br from-graphite-900 to-graphite-700 text-white shadow-md hover:-translate-y-0.5 hover:shadow-lg",
  outline:
    "bg-white text-graphite-700 border border-graphite-200 hover:bg-graphite-50 hover:border-graphite-300",
  text: "bg-transparent text-cyan font-semibold hover:opacity-70",
  approve: "bg-emerald-600 text-white hover:bg-emerald-700",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
