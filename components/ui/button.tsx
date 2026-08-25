"use client";

import type { ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "default" | "sm" | "lg" | "icon";
  loading?: boolean;
};

export function Button({
  className = "",
  variant = "primary",
  size = "default",
  loading = false,
  type = "button",
  disabled,
  children,
  ...props
}: ButtonProps) {
  const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
    primary:
      "bg-gradient-to-r from-primary to-primary-strong text-white shadow-md hover:shadow-lg hover:opacity-95",
    secondary:
      "border border-[var(--border-soft)] bg-surface text-foreground shadow-sm hover:bg-surface-muted hover:shadow-md",
    ghost:
      "bg-transparent text-text-secondary hover:bg-surface-muted hover:text-foreground",
    danger:
      "bg-gradient-to-r from-danger to-[#b83b4b] text-white shadow-md hover:shadow-lg hover:opacity-95",
    success:
      "bg-gradient-to-r from-success to-[#157a50] text-white shadow-md hover:shadow-lg hover:opacity-95",
  };

  const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
    default: "px-4 py-2 text-sm",
    sm: "px-3 py-1.5 text-xs",
    lg: "px-8 py-3 text-base",
    icon: "p-2",
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
