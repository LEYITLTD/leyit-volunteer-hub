import { cn } from "@/lib/utils";

type BadgeVariant =
  | "success"
  | "warning"
  | "error"
  | "info"
  | "neutral"
  | "points"
  | "gold";

const variantStyles: Record<BadgeVariant, string> = {
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  error:   "bg-error-bg text-error",
  info:    "bg-info-bg text-info",
  neutral: "bg-[#F3F4F6] text-[#4B5563]",
  points:  "bg-points-bg text-points",
  gold:    "bg-gold-subtle text-[#7A6A4A]",
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = "neutral", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-sm)] text-[11px] font-semibold whitespace-nowrap",
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
