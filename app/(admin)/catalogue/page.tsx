"use client";

import { useAuth } from "@/features/auth/store/auth-store";
import { notFound } from "next/navigation";
import { CatalogManager } from "@/features/catalog/components/catalog-manager";
import { Card } from "@/components/ui/card";

export default function CataloguePage() {
  const { user } = useAuth();

  if (user && user.role !== "DIRECTOR") {
    notFound();
  }

  return (
    <div className="space-y-6">
      <CatalogManager />
    </div>
  );
}
