"use client";

import { useEffect, useState } from "react";
import { OperatorManager } from "@/features/operators/components/operator-manager";
import { Card } from "@/components/ui/card";
import { InlineLoadingCard } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { apiRequest } from "@/lib/browser-api";
import type { BranchAdminResponse, OperatorProfileResponse } from "@/lib/types";

export default function OperatorsPage() {
  const [operators, setOperators] = useState<OperatorProfileResponse[]>([]);
  const [branches, setBranches] = useState<BranchAdminResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [nextOperators, nextBranches] = await Promise.all([
        apiRequest<OperatorProfileResponse[]>({ path: "/admin/operators" }),
        apiRequest<BranchAdminResponse[]>({ path: "/admin/branches" }),
      ]);
      setOperators(nextOperators);
      setBranches(nextBranches);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Unable to load staff.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operators and riders"
        description="See branch staff, and add new team members."
      />

      {loading ? <InlineLoadingCard lines={8} /> : null}

      {error ? (
        <Card>
          <p className="text-sm text-danger">{error}</p>
        </Card>
      ) : null}

      {!loading && !error ? (
        <OperatorManager operators={operators} branches={branches} onReload={load} />
      ) : null}
    </div>
  );
}
