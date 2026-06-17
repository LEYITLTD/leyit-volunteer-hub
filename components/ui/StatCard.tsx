import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
  className?: string;
}

export function StatCard({ label, value, valueClassName, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "bg-card border border-card-border rounded-[var(--radius-lg)] p-[18px] shadow-[var(--shadow-card)]",
        className,
      )}
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-text-secondary">
        {label}
      </div>
      <div className={cn("text-[30px] font-bold mt-1.5 text-text-primary", valueClassName)}>
        {value}
      </div>
    </div>
  );
}
