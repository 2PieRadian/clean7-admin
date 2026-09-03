export type BreadcrumbItem = {
  label: string;
  /** Parent segments; omitted for the current (last) segment. */
  href?: string;
};

const ROUTE_LABELS: Record<string, string> = {
  "/": "Home",
  "/dashboard": "Home",
  "/orders": "Orders",
  "/branches": "Branches",
  "/branches/create": "Add Branch",
  "/branches/capacities": "Schedule overrides",
  "/branch-admins": "Branch Admins",
  "/auth-users": "Managed Users",
  "/operators": "Operators",
  "/operators/create": "Add operator",
  "/riders": "Riders",
  "/riders/create": "Add rider",
  "/users": "Users",
  "/customers": "Users",
  "/payments": "Payments",
  "/settings": "Settings",
  "/catalogue": "Services",
  "/catalogue/categories/create": "Catalog",
  "/catalogue/subcategories/create": "Catalog",
  "/catalogue/options/create": "Catalog",
  "/schedule-overrides": "Schedule overrides",
  "/geo-overrides": "Geo overrides",
  "/laundry": "Laundry queue",
  "/delivery-trips": "Delivery trips",
  "/profiles": "Customer And Staff Details",
};

function humanizeSegment(segment: string): string {
  return segment
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function fallbackTrail(pathname: string): BreadcrumbItem[] {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) {
    return [{ label: "Home" }];
  }

  const items: BreadcrumbItem[] = [];
  let acc = "";

  for (let i = 0; i < parts.length; i++) {
    acc += `/${parts[i]}`;
    const label = ROUTE_LABELS[acc] ?? humanizeSegment(parts[i]);
    const isLast = i === parts.length - 1;
    items.push({
      label,
      href: isLast ? undefined : acc,
    });
  }

  return items;
}

/** Breadcrumb trail for the admin top bar (includes Dashboard as root when nested). */
export function breadcrumbsForPath(pathname: string): BreadcrumbItem[] {
  const normalized =
    pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

  if (normalized === "/" || normalized === "/dashboard") {
    return [{ label: "Home" }];
  }

  let tail: BreadcrumbItem[];

  if (ROUTE_LABELS[normalized]) {
    tail = [{ label: ROUTE_LABELS[normalized] }];
    return [{ label: "Home", href: "/dashboard" }, ...tail];
  }

  const orderMatch = /^\/orders\/([^/]+)$/.exec(normalized);
  if (orderMatch) {
    const id = orderMatch[1];
    tail = [
      { label: "Orders", href: "/orders" },
      { label: `Order ${id}` },
    ];
    return [{ label: "Home", href: "/dashboard" }, ...tail];
  }

  const branchMatch = /^\/branches\/([^/]+)$/.exec(normalized);
  if (
    branchMatch &&
    branchMatch[1] !== "create" &&
    branchMatch[1] !== "capacities"
  ) {
    const id = branchMatch[1];
    tail = [
      { label: "Branches", href: "/branches" },
      { label: `Branch ${id}` },
    ];
    return [{ label: "Home", href: "/dashboard" }, ...tail];
  }

  const optionSlug = /^\/catalogue\/options\/([^/]+)$/.exec(normalized);
  if (optionSlug && optionSlug[1] !== "create") {
    const slug = optionSlug[1];
    tail = [
      { label: "Services", href: "/catalogue" },
      { label: humanizeSegment(slug) },
    ];
    return [{ label: "Home", href: "/dashboard" }, ...tail];
  }

  tail = fallbackTrail(normalized);
  return [{ label: "Home", href: "/dashboard" }, ...tail];
}
