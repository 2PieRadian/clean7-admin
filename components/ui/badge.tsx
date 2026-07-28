import type { ReactNode } from "react";
import type { ServiceMode } from "@/lib/types";
import { getServiceModeTone, getStatusTone, humanizeToken } from "@/lib/format";

type BadgeProps = {
  children?: ReactNode;
  tone?:
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "muted"
    | "service-blue"
    | "service-orange";
  value?: string | null;
  variant?: "status" | "fulfillment";
  className?: string;
};

export function Badge({
  children,
  tone,
  value,
  variant = "status",
  className = "",
}: BadgeProps) {
  const resolvedTone =
    tone ??
    (variant === "fulfillment"
      ? getServiceModeTone(value as ServiceMode | null | undefined)
      : (getStatusTone(value) as BadgeProps["tone"]));

  const styles: Record<NonNullable<BadgeProps["tone"]>, string> = {
    success: "bg-success-surface text-success",
    warning: "bg-warning-surface text-warning",
    danger: "bg-danger-surface text-danger",
    info: "bg-info text-white",
    muted: "bg-surface-soft text-text-secondary",
    "service-blue": "bg-service-blue text-white",
    "service-orange": "bg-service-orange-surface text-service-orange",
  };

  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-1 text-[10px] font-medium leading-none ${styles[resolvedTone ?? "muted"]} ${className}`.trim()}
    >
      {children ?? humanizeToken(value ?? "unknown")}
    </span>
  );
}
