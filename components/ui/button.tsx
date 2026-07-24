"use client";

import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
};

export function Button({
  className = "",
  variant = "primary",
  type = "button",
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

  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
