"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { InlineLoadingCard } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { apiRequest, apiFetch } from "@/lib/browser-api";
import { formatDate, formatDateTime, humanizeToken } from "@/lib/format";
import type { Career, CareerApplication, ApplicationStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Eye,
  Search,
  FileText,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Star,
  ClipboardCheck,
  Trash2,
} from "lucide-react";
import { getGatewayUrl } from "@/lib/env";
import { getStoredSession } from "@/lib/browser-session";

const ALL_STATUSES: ApplicationStatus[] = [
  "PENDING",
  "REVIEWED",
  "SHORTLISTED",
  "ACCEPTED",
  "REJECTED",
];

const STATUS_ICONS: Record<ApplicationStatus, typeof Clock> = {
  PENDING: Clock,
  REVIEWED: ClipboardCheck,
  SHORTLISTED: Star,
  ACCEPTED: CheckCircle2,
  REJECTED: XCircle,
};

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<CareerApplication[]>([]);
  const [careers, setCareers] = useState<Career[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "ALL">(
    "ALL",
  );
  const [careerFilter, setCareerFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  // Status update loading
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query: Record<string, string> = {};
      if (statusFilter !== "ALL") query.status = statusFilter;
      if (careerFilter) query.careerId = careerFilter;
      if (debouncedSearch.trim()) query.search = debouncedSearch.trim();

      const result = await apiRequest<CareerApplication[]>({
        path: "/admin/careers/applications",
        query,
      });
      setApplications(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load applications.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, careerFilter, debouncedSearch]);

  const loadCareers = useCallback(async () => {
    try {
      const result = await apiRequest<Career[]>({ path: "/admin/careers" });
      setCareers(result);
    } catch {
      // Non-critical — career filter won't work but apps still load
    }
  }, []);

  useEffect(() => {
    void loadCareers();
  }, [loadCareers]);

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  async function handleStatusChange(
    appId: string,
    newStatus: ApplicationStatus,
  ) {
    setUpdatingId(appId);
    try {
      await apiRequest({
        path: `/admin/careers/applications/${appId}/status`,
        method: "PATCH",
        body: { status: newStatus },
      });
      // Update locally instead of full refetch for responsiveness
      setApplications((prev) =>
        prev.map((app) =>
          app.id === appId
            ? {
              ...app,
              status: newStatus,
              reviewedAt: new Date().toISOString(),
            }
            : app,
        ),
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error updating status");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDeleteApplication(appId: string) {
    if (!confirm("Are you sure you want to delete this application?")) return;
    try {
      await apiRequest({
        path: `/admin/careers/applications/${appId}`,
        method: "DELETE",
      });
      setApplications(prev => prev.filter(a => a.id !== appId));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error deleting application");
    }
  }

  async function handleResumeDownload(app: CareerApplication) {
    try {
      const session = getStoredSession();
      const url = `${getGatewayUrl()}/admin/careers/applications/${app.id}/resume`;
      const response = await fetch(url, {
        headers: session?.token
          ? { Authorization: `Bearer ${session.token}` }
          : {},
      });

      if (!response.ok) {
        throw new Error("Failed to download resume");
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = app.resumeOriginalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to download resume");
    }
  }

  // Stats
  const stats = useMemo(() => {
    const total = applications.length;
    const pending = applications.filter((a) => a.status === "PENDING").length;
    const reviewed = applications.filter((a) => a.status === "REVIEWED").length;
    const shortlisted = applications.filter(
      (a) => a.status === "SHORTLISTED",
    ).length;
    const accepted = applications.filter((a) => a.status === "ACCEPTED").length;
    const rejected = applications.filter((a) => a.status === "REJECTED").length;
    return { total, pending, reviewed, shortlisted, accepted, rejected };
  }, [applications]);

  const columns = useMemo(
    () => [
      {
        key: "applicant",
        header: "Applicant",
        render: (app: CareerApplication) => (
          <div className="min-w-[160px]">
            <Link
              href={`/careers/applications/${app.id}`}
              className="font-medium text-foreground hover:text-primary transition-colors"
            >
              {app.fullName}
            </Link>
            <p className="text-xs text-text-muted mt-0.5">{app.email}</p>
          </div>
        ),
      },
      {
        key: "position",
        header: "Position",
        render: (app: CareerApplication) => (
          <span className="text-sm">{app.career?.name ?? "—"}</span>
        ),
      },
      {
        key: "phone",
        header: "Phone",
        render: (app: CareerApplication) => (
          <a
            href={`tel:${app.phone}`}
            className="text-sm text-primary hover:underline"
          >
            {app.phone}
          </a>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (app: CareerApplication) => (
          <Badge value={app.status}>{humanizeToken(app.status)}</Badge>
        ),
      },
      {
        key: "applied",
        header: "Applied",
        render: (app: CareerApplication) => (
          <span className="text-xs text-text-muted whitespace-nowrap">
            {formatDate(app.createdAt)}
          </span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        render: (app: CareerApplication) => (
          <div className="flex items-center gap-1">
            <select
              className="text-xs px-1.5 py-1 rounded-lg border border-[var(--border-soft)] bg-surface text-foreground outline-none cursor-pointer"
              value={app.status}
              disabled={updatingId === app.id}
              onChange={(e) =>
                handleStatusChange(app.id, e.target.value as ApplicationStatus)
              }
            >
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {humanizeToken(s)}
                </option>
              ))}
            </select>
            <Button
              variant="ghost"
              className="!p-1.5"
              onClick={() => handleResumeDownload(app)}
              title="Download Resume"
            >
              <Download className="w-3.5 h-3.5" />
            </Button>
            <Link href={`/careers/applications/${app.id}`}>
              <Button variant="ghost" className="!p-1.5" title="View Details">
                <Eye className="w-3.5 h-3.5" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              className="!p-1.5 text-danger hover:text-danger-hover"
              onClick={() => handleDeleteApplication(app.id)}
              title="Delete Application"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [updatingId],
  );

  const statCards = [
    {
      label: "Total",
      value: stats.total,
      icon: Users,
      color: "text-foreground",
      bg: "bg-surface-muted",
    },
    {
      label: "Pending",
      value: stats.pending,
      icon: Clock,
      color: "text-warning",
      bg: "bg-warning-surface",
    },
    {
      label: "Reviewed",
      value: stats.reviewed,
      icon: ClipboardCheck,
      color: "text-info",
      bg: "bg-info-surface",
    },
    {
      label: "Shortlisted",
      value: stats.shortlisted,
      icon: Star,
      color: "text-warning",
      bg: "bg-warning-surface",
    },
    {
      label: "Accepted",
      value: stats.accepted,
      icon: CheckCircle2,
      color: "text-success",
      bg: "bg-success-surface",
    },
    {
      label: "Rejected",
      value: stats.rejected,
      icon: XCircle,
      color: "text-danger",
      bg: "bg-danger-surface",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/careers">
          <Button variant="ghost">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <PageHeader
          title="Job Applications"
          description="Review applicants, manage statuses, and download resumes."
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className="p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => {
                if (stat.label === "Total") {
                  setStatusFilter("ALL");
                } else {
                  setStatusFilter(
                    stat.label.toUpperCase() as ApplicationStatus,
                  );
                }
              }}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${stat.bg}`}
              >
                <Icon className={`w-4.5 h-4.5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xl font-semibold text-foreground leading-none">
                  {stat.value}
                </p>
                <p className="text-xs text-text-muted mt-0.5">{stat.label}</p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Filters Bar */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-4">
          {/* Status filter tabs */}
          <div className="flex-1 min-w-[200px]">
            <span className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2 block">
              Status
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${statusFilter === "ALL"
                    ? "bg-primary text-white shadow-sm"
                    : "bg-surface-muted text-text-secondary hover:bg-surface-soft"
                  }`}
              >
                All
              </button>
              {ALL_STATUSES.map((s) => {
                const Icon = STATUS_ICONS[s];
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusFilter(s)}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${statusFilter === s
                        ? "bg-primary text-white shadow-sm"
                        : "bg-surface-muted text-text-secondary hover:bg-surface-soft"
                      }`}
                  >
                    <Icon className="w-3 h-3" />
                    {humanizeToken(s)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Career filter */}
          <div className="w-[200px]">
            <Select
              label="Position"
              value={careerFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setCareerFilter(e.target.value)
              }
            >
              <option value="">All Positions</option>
              {careers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>

          {/* Search */}
          <div className="w-[250px]">
            <Field
              label="Search"
              placeholder="Name, email, or phone…"
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearchQuery(e.target.value)
              }
            />
          </div>
        </div>
      </Card>

      {/* Error */}
      {error && (
        <Card>
          <p className="text-sm text-danger p-4">{error}</p>
        </Card>
      )}

      {/* Data Table */}
      <DataTable
        columns={columns}
        rows={applications}
        loading={loading}
        emptyMessage="No applications found matching your filters."
        skeletonRows={8}
      />
    </div>
  );
}
