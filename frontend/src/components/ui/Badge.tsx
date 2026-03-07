import { clsx } from "clsx";
import type { BurnoutRisk } from "@/lib/types";

interface BadgeProps {
  label: string;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  dot?: boolean;
}

const variantStyles: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "bg-slate-100 text-slate-600 border-slate-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  danger:  "bg-red-50 text-red-700 border-red-200",
  info:    "bg-blue-50 text-blue-700 border-blue-200",
};

const dotColors: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "bg-slate-400",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger:  "bg-red-500",
  info:    "bg-blue-500",
};

export function Badge({ label, variant = "default", dot = false }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variantStyles[variant]
      )}
    >
      {dot && (
        <span className={clsx("h-1.5 w-1.5 rounded-full", dotColors[variant])} aria-hidden="true" />
      )}
      {label}
    </span>
  );
}

export function BurnoutBadge({ risk }: { risk: BurnoutRisk }) {
  const map: Record<BurnoutRisk, { variant: BadgeProps["variant"]; label: string }> = {
    LOW:    { variant: "success", label: "Low Risk"    },
    MEDIUM: { variant: "warning", label: "Medium Risk" },
    HIGH:   { variant: "danger",  label: "High Risk"   },
  };
  const { variant, label } = map[risk];
  return <Badge label={label} variant={variant} dot />;
}
