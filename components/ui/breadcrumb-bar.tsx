import Link from "next/link";
import type { BreadcrumbItem } from "@/lib/breadcrumbs";
import type { ReactNode } from "react";

export type { BreadcrumbItem } from "@/lib/breadcrumbs";

function SlashSeparator() {
  return <span className="px-1.5 text-text-soft">/</span>;
}

type BreadcrumbBarProps = {
  items: BreadcrumbItem[];
  homeHref?: string;
  className?: string;
};

export function BreadcrumbBar({
  items,
  homeHref = "/dashboard",
  className,
}: BreadcrumbBarProps): ReactNode {
  if (!items.length) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex flex-wrap items-center text-[16px] leading-snug ${className ?? ""}`}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const content = isLast ? (
          <span className="font-semibold tracking-[-0.02em] text-foreground">
            {item.label}
          </span>
        ) : item.href ? (
          <Link
            href={item.href === "/dashboard" ? homeHref : item.href}
            className="font-medium text-text-secondary transition-colors hover:text-foreground"
          >
            {item.label}
          </Link>
        ) : (
          <span className="font-medium text-text-secondary">{item.label}</span>
        );

        return (
          <span
            key={`${item.label}-${index}`}
            className="inline-flex items-center"
          >
            {index > 0 ? <SlashSeparator /> : null}
            {content}
          </span>
        );
      })}
    </nav>
  );
}
