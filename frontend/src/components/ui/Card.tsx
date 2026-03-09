import { clsx } from "clsx";
import type { ReactNode } from "react";

interface CardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
  accent?: boolean;
}

const paddingStyles = { sm: "p-4", md: "p-5", lg: "p-7" };

export function Card({
  title,
  subtitle,
  children,
  className,
  padding = "md",
  accent = false,
}: CardProps) {
  return (
    <div
      className={clsx(
        "relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card",
        "transition-all duration-200 hover:shadow-card-md hover:-translate-y-px",
        accent &&
          "before:absolute before:inset-x-4 before:top-0 before:h-0.5 before:rounded-full before:bg-gradient-to-r before:from-brand-500 before:to-indigo-500",
        paddingStyles[padding],
        className
      )}
    >
      {(title || subtitle) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-[15px] font-semibold text-slate-800 dark:text-slate-100 leading-snug">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400 leading-snug">{subtitle}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
