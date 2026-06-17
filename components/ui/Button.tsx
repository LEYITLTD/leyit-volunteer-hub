import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "gold" | "outline" | "ghost" | "danger";
type ButtonSize    = "sm" | "md" | "lg";

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-chrome text-white border-transparent hover:bg-[#2A2420]",
  gold:    "bg-gold text-white border-transparent hover:bg-[#8F6E3A]",
  outline: "bg-transparent text-text-warm border-input-border hover:bg-gold-subtle",
  ghost:   "bg-transparent text-text-muted border-transparent hover:text-text-secondary",
  danger:  "bg-error-bg text-error border-transparent hover:bg-[#FECACA]",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-2 text-[12px] min-h-[36px]",
  md: "px-[18px] py-2.5 text-[14px] min-h-[44px]",
  lg: "px-6 py-3 text-[15px] min-h-[48px]",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", fullWidth, className, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-md)] font-semibold border cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  ),
);
Button.displayName = "Button";
