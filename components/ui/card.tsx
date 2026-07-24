import type { HTMLAttributes } from "react";

export function Card({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`card-surface rounded-[24px] border border-[var(--border-soft)] bg-surface p-4 md:p-5 shadow-sm ${className}`}
      {...props}
    />
  );
}
