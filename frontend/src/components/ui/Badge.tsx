import { clsx } from "clsx";
import type { BurnoutRisk } from "@/lib/types";

interface BadgeProps {
  label: string;
  variant?: "default" | "success" | "warning" | "danger" | "info";
}

const variantStyles = {
  default: "bg-gray-100 text-gray-700",
  success: "bg-green-100 text-green-700",
  warning: "bg-yellow-100 text-yellow-700",
  danger: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
};

export function Badge({ label, variant = "default" }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantStyles[variant]
      )}
    >
      {label}
    </span>
  );
}

export function BurnoutBadge({ risk }: { risk: BurnoutRisk }) {
  const map: Record<BurnoutRisk, { variant: BadgeProps["variant"]; label: string }> = {
    LOW: { variant: "success", label: "Low Burnout Risk" },
    MEDIUM: { variant: "warning", label: "Medium Burnout Risk" },
    HIGH: { variant: "danger", label: "High Burnout Risk" },
  };
  const { variant, label } = map[risk];
  return <Badge label={label} variant={variant} />;
}
