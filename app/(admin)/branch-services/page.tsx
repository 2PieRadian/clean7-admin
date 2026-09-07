"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { useAuth } from "@/features/auth/store/auth-store";
import { apiRequest } from "@/lib/browser-api";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import type { BranchOption } from "@/lib/types";
import { BranchServicesManager } from "@/features/catalog/components/branch-services-manager";
import { Building2 } from "lucide-react";

export default function BranchServicesPage() {
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
        if (b.length > 0) {
          setSelectedBranchId(b[0].id);
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
    return <div className="p-8 text-sm text-text-muted">Loading branches...</div>;
  }

  const selectedBranch = branches.find((b) => b.id === selectedBranchId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branch-wise Services"
        description="Configure branch-specific categories, services, items, delivery promise times, and price overrides without altering the Base Catalog."
      />

      {error ? (
        <Card>
          <p className="text-sm text-danger">{error}</p>
        </Card>
      ) : null}

      {/* Branch Selector Card */}
      <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground block">Select Active Branch</label>
            <span className="text-[11px] text-text-muted">
              Choose a branch to view and customize its active catalog
            </span>
          </div>
        </div>

        {isDirector ? (
          <select
            className="w-full sm:w-72 rounded-xl border border-[var(--border-soft)] bg-surface px-3 py-2 text-xs font-medium focus:border-primary focus:outline-none shadow-sm"
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
          <div className="text-xs font-medium px-3 py-2 bg-surface-muted rounded-xl border border-[var(--border-soft)]">
            {branches[0]?.name}
          </div>
        )}
      </Card>

      {selectedBranchId ? (
        <BranchServicesManager branchId={selectedBranchId} branchName={selectedBranch?.name} />
      ) : (
        <Card className="p-8 text-center text-sm text-text-secondary">
          Please select a branch above to view and customize its services.
        </Card>
      )}
    </div>
  );
}
