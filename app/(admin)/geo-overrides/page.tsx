"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { useAuth } from "@/features/auth/store/auth-store";
import { apiRequest } from "@/lib/browser-api";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import type { BranchOption } from "@/lib/types";
import { BranchCatalogManager } from "@/features/catalog/components/branch-catalog-manager";

export default function GeoOverridesPage() {
  const { user } = useAuth();
  const isDirector = user?.role === "DIRECTOR";

  if (user && !isDirector) {
    notFound();
  }

  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const b = await apiRequest<BranchOption[]>({ path: "/admin/branches/options" });
        setBranches(b);
        if (!isDirector && b.length > 0) {
          setSelectedBranchId(b[0].id);
        } else if (isDirector && b.length > 0) {
          setSelectedBranchId(b[0].id); // Select first branch by default
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load branches");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [isDirector]);

  if (loading) {
    return <div className="p-8 text-text-muted">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catalog"
        title="Branch Prices Override"
        description="Override pricing by branch for services and add-ons."
      />

      {error ? (
        <Card>
          <p className="text-sm text-danger">{error}</p>
        </Card>
      ) : null}

      <Card className="flex flex-col sm:flex-row sm:items-center gap-4">
        <label className="text-sm font-medium text-foreground">Selected Branch</label>
        {isDirector ? (
          <select
            className="w-full sm:w-64 rounded-md border border-[var(--border-soft)] bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
          >
            <option value="">Select a branch</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        ) : (
          <div className="text-sm font-medium px-3 py-2 bg-surface-muted rounded border border-[var(--border-soft)]">
            {branches[0]?.name}
          </div>
        )}
      </Card>

      {selectedBranchId ? (
        <BranchCatalogManager branchId={selectedBranchId} />
      ) : (
        <Card>
          <p className="text-sm text-text-secondary">Please select a branch to view and override prices.</p>
        </Card>
      )}
    </div>
  );
}
