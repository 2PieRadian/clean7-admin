import type { ReactNode } from "react";
import { AuthGate } from "@/components/admin/auth-gate";

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AuthGate>{children}</AuthGate>;
}
