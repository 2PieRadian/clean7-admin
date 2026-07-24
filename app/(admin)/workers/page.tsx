"use client";

import { useEffect, useState } from "react";
import { WorkerManager } from "@/features/workers/components/worker-manager";
import { Card } from "@/components/ui/card";
import { InlineLoadingCard } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { apiRequest } from "@/lib/browser-api";
import type { BranchAdminResponse, WorkerProfileResponse } from "@/lib/types";

export default function WorkersPage() {
  const [workers, setWorkers] = useState<WorkerProfileResponse[]>([]);
  const [branches, setBranches] = useState<BranchAdminResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [nextWorkers, nextBranches] = await Promise.all([
        apiRequest<WorkerProfileResponse[]>({ path: "/admin/workers" }),
        apiRequest<BranchAdminResponse[]>({ path: "/admin/branches" }),
      ]);
      setWorkers(nextWorkers);
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
        eyebrow="Staff"
        title="Workers and riders"
        description="See branch staff, and add new team members."
      />

      {loading ? <InlineLoadingCard lines={8} /> : null}

      {error ? (
        <Card>
          <p className="text-sm text-danger">{error}</p>
        </Card>
      ) : null}

      {!loading && !error ? (
        <WorkerManager workers={workers} branches={branches} onReload={load} />
      ) : null}
    </div>
  );
}
