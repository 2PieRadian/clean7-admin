"use client";

import { useEffect, useState } from "react";
import { WorkerCreateForm } from "@/features/workers/components/worker-create-form";
import { Card } from "@/components/ui/card";
import { InlineLoadingCard } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { apiRequest } from "@/lib/browser-api";
import type { BranchAdminResponse } from "@/lib/types";

export default function CreateWorkerPage() {
  const [branches, setBranches] = useState<BranchAdminResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const nextBranches = await apiRequest<BranchAdminResponse[]>({
          path: "/admin/branches",
        });

        if (!cancelled) {
          setBranches(nextBranches);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(
            nextError instanceof Error ? nextError.message : "Unable to load branches.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add staff"
        description="Creates sign-in and a worker or rider profile in one step."
      />

      {loading ? <InlineLoadingCard lines={7} /> : null}

      {error ? (
        <Card>
          <p className="text-sm text-danger">{error}</p>
        </Card>
      ) : null}

      {!loading ? <WorkerCreateForm branches={branches} /> : null}
    </div>
  );
}
