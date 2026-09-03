"use client";

import { useCallback, useEffect, useState } from "react";
import { OperatorManager } from "@/features/operators/components/operator-manager";
import { Card } from "@/components/ui/card";
import { InlineLoadingCard } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { apiRequest } from "@/lib/browser-api";
import type { BranchAdminResponse, OperatorProfileResponse } from "@/lib/types";

export default function RidersPage() {
  const [riders, setRiders] = useState<OperatorProfileResponse[]>([]);
  const [branches, setBranches] = useState<BranchAdminResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        const [nextOperators, nextBranches] = await Promise.all([
          apiRequest<OperatorProfileResponse[]>({ path: "/admin/operators" }),
          apiRequest<BranchAdminResponse[]>({ path: "/admin/branches" }),
        ]);
        if (!cancelled) {
          setRiders(nextOperators);
          setBranches(nextBranches);
          setError(null);
          setLoading(false);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(
            nextError instanceof Error ? nextError.message : "Unable to load riders.",
          );
          setLoading(false);
        }
      }
    }
    void fetchData();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Delivery Riders"
        description="See branch delivery riders, and add new fleet members."
      />

      {loading ? <InlineLoadingCard lines={8} /> : null}

      {error ? (
        <Card>
          <p className="text-sm text-danger">{error}</p>
        </Card>
      ) : null}

      {!loading && !error ? (
        <OperatorManager
          operators={riders}
          branches={branches}
          onReload={load}
          role="RIDER"
        />
      ) : null}
    </div>
  );
}
