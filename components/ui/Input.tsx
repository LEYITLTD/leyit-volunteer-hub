import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, className, id, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={id}
          className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary"
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={cn(
          "w-full border border-input-border rounded-[var(--radius-md)] px-3 py-2.5 text-[14px] bg-[var(--color-input-bg)] text-text-primary transition-[border-color,box-shadow]",
          "disabled:bg-[var(--color-input-bg-disabled)] disabled:border-[var(--color-input-border-disabled)] disabled:text-text-muted",
          className,
        )}
        {...props}
      />
      {hint && <p className="text-[12px] text-text-muted">{hint}</p>}
    </div>
  ),
);
Input.displayName = "Input";
