"use client";

import { useMemo, useState, useTransition } from "react";
import { apiRequest } from "@/lib/browser-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Field, Select, TextArea } from "@/components/ui/field";
import { MutationStatus } from "@/components/admin/mutation-status";
import { useAuth } from "@/features/auth/store/auth-store";
import type { BranchAdminResponse, ScheduleOverrideResponse } from "@/lib/types";
import { slotCodes } from "@/lib/constants";
import { formatDate, humanizeToken } from "@/lib/format";

export function ScheduleOverrideManager({
  branches,
  overridesByBranch,
  onReload,
}: {
  branches: BranchAdminResponse[];
  overridesByBranch: Record<string, ScheduleOverrideResponse[]>;
  onReload: () => Promise<void>;
}) {
  const { user } = useAuth();
  const isDirector = user?.role === "DIRECTOR";

  const [selectedBranchId, setSelectedBranchId] = useState(branches[0]?.id ?? "");
  const [selectedOverrideId, setSelectedOverrideId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeBranchId = selectedBranchId || branches[0]?.id || "";

  const selectedOverrides = useMemo(
    () => overridesByBranch[activeBranchId] ?? [],
    [activeBranchId, overridesByBranch],
  );

  async function submitOverride(formData: FormData, overrideId?: string) {
    setMessage(null);
    setError(null);

    const slotRaw = String(formData.get("slotCode") ?? "");
    const slotCode = slotRaw === "__FULL_DAY__" ? null : slotRaw;

    const payload = {
      slotCode,
      specificDate: String(formData.get("specificDate") ?? "").trim(),
      reason: String(formData.get("reason") ?? "").trim(),
    };

    try {
      await apiRequest({
        path: overrideId
          ? `/admin/branches/${activeBranchId}/schedule-overrides/${overrideId}`
          : `/admin/branches/${activeBranchId}/schedule-overrides`,
        method: overrideId ? "PATCH" : "POST",
        body: payload,
      });
      setMessage(overrideId ? "Override updated." : "Closure added.");
      setSelectedOverrideId("");
      await onReload();
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Could not save schedule override.",
      );
    }
  }

  async function deleteOverride(overrideId: string) {
    setMessage(null);
    setError(null);

    try {
      await apiRequest({
        path: `/admin/branches/${activeBranchId}/schedule-overrides/${overrideId}`,
        method: "DELETE",
        body: {},
      });
      setMessage("Override removed.");
      await onReload();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not delete override.");
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <Card className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Schedule overrides</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Close specific slots or the full day for a given date. Uses branch schedule override
              APIs — not manual slot inventory.
            </p>
          </div>
          <Badge tone="service-blue">{branches.length} branches</Badge>
        </div>

        <Select
          label="Branch"
          name="branchPicker"
          value={activeBranchId}
          onChange={(event) => setSelectedBranchId(event.target.value)}
          disabled={!isDirector && branches.length <= 1}
        >
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </Select>

        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            startTransition(() => submitOverride(formData));
          }}
        >
          <Field label="Date" name="specificDate" type="date" required />
          <Select label="Closure scope" name="slotCode" defaultValue={slotCodes[0]}>
            {slotCodes.map((slot) => (
              <option key={slot} value={slot}>
                Disable {humanizeToken(slot)}
              </option>
            ))}
            <option value="__FULL_DAY__">Full day (all slots)</option>
          </Select>
          <TextArea label="Reason" name="reason" required placeholder="Holiday, maintenance..." />
          <Button type="submit" disabled={isPending}>
            Add closure
          </Button>
        </form>
        <MutationStatus error={error} success={message} />
      </Card>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-foreground">Existing overrides</h3>
          <select
            className="rounded-full border border-[var(--border-soft)] bg-surface px-3 py-2 text-xs"
            value={selectedOverrideId}
            onChange={(e) => setSelectedOverrideId(e.target.value)}
          >
            <option value="">Select to edit</option>
            {selectedOverrides.map((row) => (
              <option key={row.id} value={row.id}>
                {formatDate(row.specificDate)} —{" "}
                {row.slotCode ? humanizeToken(row.slotCode) : "Full day"}
              </option>
            ))}
          </select>
        </div>

        <DataTable
          rows={selectedOverrides}
          emptyMessage="No overrides for this branch."
          columns={[
            {
              key: "when",
              header: "Date",
              render: (row) => formatDate(row.specificDate),
            },
            {
              key: "slot",
              header: "Scope",
              render: (row) =>
                row.slotCode ? humanizeToken(row.slotCode) : "Full day",
            },
            {
              key: "reason",
              header: "Reason",
              render: (row) => row.reason,
            },
          ]}
        />

        {selectedOverrideId ? (
          <form
            className="grid gap-4 border-t border-[var(--border-soft)] pt-4"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              startTransition(() => submitOverride(formData, selectedOverrideId));
            }}
          >
            <Field label="Date" name="specificDate" type="date" required />
            <Select label="Closure scope" name="slotCode" defaultValue={slotCodes[0]}>
              {slotCodes.map((slot) => (
                <option key={slot} value={slot}>
                  Disable {humanizeToken(slot)}
                </option>
              ))}
              <option value="__FULL_DAY__">Full day (all slots)</option>
            </Select>
            <TextArea label="Reason" name="reason" required />
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={isPending}>
                Update override
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={isPending}
                onClick={() => startTransition(() => deleteOverride(selectedOverrideId))}
              >
                Delete
              </Button>
            </div>
          </form>
        ) : null}
      </Card>
    </div>
  );
}
