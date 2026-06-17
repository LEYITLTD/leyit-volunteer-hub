import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
}

export function Card({ children, className, as: Tag = "div" }: CardProps) {
  return (
    <Tag
      className={cn(
        "bg-card border border-card-border rounded-[var(--radius-lg)] shadow-[var(--shadow-card)]",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("p-[18px]", className)}>{children}</div>;
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "px-[18px] py-3 border-b border-divider bg-[var(--color-card-header-bg)] rounded-t-[var(--radius-lg)]",
        "text-[13px] font-semibold text-text-secondary",
        className,
      )}
    >
      {children}
    </div>
  );
}
