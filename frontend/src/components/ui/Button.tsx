import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  children: ReactNode;
}

const variantStyles = {
  primary:
    "bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-sm " +
    "hover:from-brand-700 hover:to-indigo-700 hover:shadow-md " +
    "disabled:from-brand-200 disabled:to-indigo-200 disabled:shadow-none",
  secondary:
    "bg-white text-slate-700 border border-slate-300 shadow-sm " +
    "hover:bg-slate-50 hover:border-slate-400 " +
    "disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200",
  danger:
    "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-sm " +
    "hover:from-red-700 hover:to-rose-700 " +
    "disabled:from-red-200 disabled:to-rose-200",
  ghost:
    "text-brand-600 hover:bg-brand-50 hover:text-brand-700 " +
    "disabled:text-slate-300",
};

const sizeStyles = {
  sm: "px-3 py-1.5 text-[13px] rounded-lg",
  md: "px-4 py-2 text-sm rounded-xl",
  lg: "px-6 py-2.5 text-[15px] rounded-xl",
};

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={twMerge(
        clsx(
          "inline-flex items-center justify-center gap-2 font-medium transition-all duration-150",
          "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2",
          "disabled:cursor-not-allowed active:scale-[0.98]",
          variantStyles[variant],
          sizeStyles[size],
          className
        )
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
