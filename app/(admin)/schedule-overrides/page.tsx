"use client";

import { useCallback, useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { InlineLoadingCard } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { ScheduleOverrideManager } from "@/components/admin/schedule-override-manager";
import { useAuth } from "@/features/auth/store/auth-store";
import { apiRequest } from "@/lib/browser-api";
import type { BranchAdminResponse, ScheduleOverrideResponse } from "@/lib/types";

export default function ScheduleOverridesPage() {
  const { user } = useAuth();
  const isDirector = user?.role === "DIRECTOR";

  if (user && !isDirector) {
    notFound();
  }

  const [branches, setBranches] = useState<BranchAdminResponse[]>([]);
  const [overridesByBranch, setOverridesByBranch] = useState<
    Record<string, ScheduleOverrideResponse[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const branchList = await apiRequest<BranchAdminResponse[]>({
        path: "/admin/branches",
      });
      setBranches(branchList);

      const entries = await Promise.all(
        branchList.map(async (b) => {
          const rows = await apiRequest<ScheduleOverrideResponse[]>({
            path: `/admin/branches/${b.id}/schedule-overrides`,
          });
          return [b.id, rows] as const;
        }),
      );

      setOverridesByBranch(Object.fromEntries(entries));
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Unable to load schedule overrides.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);


  return (
    <div className="space-y-6">
      <PageHeader
        title="Schedule overrides"
        description="Close slots or full days for a branch. Directors manage all branches; branch admins only their assigned branch."
      />

      {error ? (
        <Card>
          <p className="text-sm text-danger">{error}</p>
        </Card>
      ) : null}

      {loading ? <InlineLoadingCard lines={6} /> : null}

      {!loading && branches.length > 0 ? (
        <ScheduleOverrideManager
          branches={branches}
          overridesByBranch={overridesByBranch}
          onReload={load}
        />
      ) : null}

      {!loading && branches.length === 0 ? (
        <Card>
          <p className="text-sm text-text-secondary">No branches available.</p>
        </Card>
      ) : null}
    </div>
  );
}
