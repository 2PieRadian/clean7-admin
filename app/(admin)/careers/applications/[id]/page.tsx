"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { InlineLoadingCard } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/browser-api";
import { formatDate, formatDateTime, humanizeToken } from "@/lib/format";
import type { CareerApplication, ApplicationStatus } from "@/lib/types";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  FileText,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  Star,
  ClipboardCheck,
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

const STATUS_DETAILS: Record<
  ApplicationStatus,
  { icon: typeof Clock; label: string; description: string; variant: string }
> = {
  PENDING: {
    icon: Clock,
    label: "Pending Review",
    description: "This application hasn't been reviewed yet.",
    variant: "warning",
  },
  REVIEWED: {
    icon: ClipboardCheck,
    label: "Reviewed",
    description: "Application has been reviewed by an admin.",
    variant: "info",
  },
  SHORTLISTED: {
    icon: Star,
    label: "Shortlisted",
    description: "Candidate has been shortlisted for further evaluation.",
    variant: "warning",
  },
  ACCEPTED: {
    icon: CheckCircle2,
    label: "Accepted",
    description: "Candidate has been accepted for the position.",
    variant: "success",
  },
  REJECTED: {
    icon: XCircle,
    label: "Rejected",
    description: "Application has been rejected.",
    variant: "danger",
  },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ApplicationDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [application, setApplication] = useState<CareerApplication | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [resumePreviewUrl, setResumePreviewUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiRequest<CareerApplication>({
        path: `/admin/careers/applications/${id}`,
      });
      setApplication(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load application.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleStatusChange(newStatus: ApplicationStatus) {
    setUpdatingStatus(true);
    try {
      const updated = await apiRequest<CareerApplication>({
        path: `/admin/careers/applications/${id}/status`,
        method: "PATCH",
        body: { status: newStatus },
      });
      setApplication(updated);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error updating status");
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleResumeDownload() {
    if (!application) return;
    try {
      const session = getStoredSession();
      const url = `${getGatewayUrl()}/admin/careers/applications/${application.id}/resume`;
      const response = await fetch(url, {
        headers: session?.token
          ? { Authorization: `Bearer ${session.token}` }
          : {},
      });

      if (!response.ok) throw new Error("Failed to download resume");

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = application.resumeOriginalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to download resume");
    }
  }

  async function handleResumePreview() {
    if (!application) return;

    if (resumePreviewUrl) {
      // Toggle off
      URL.revokeObjectURL(resumePreviewUrl);
      setResumePreviewUrl(null);
      return;
    }

    try {
      const session = getStoredSession();
      const url = `${getGatewayUrl()}/admin/careers/applications/${application.id}/resume`;
      const response = await fetch(url, {
        headers: session?.token
          ? { Authorization: `Bearer ${session.token}` }
          : {},
      });

      if (!response.ok) throw new Error("Failed to load resume");

      const blob = await response.blob();
      const previewUrl = URL.createObjectURL(blob);
      setResumePreviewUrl(previewUrl);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to preview resume");
    }
  }

  async function handleDeleteApplication() {
    if (!application) return;
    if (!confirm("Are you sure you want to delete this application? This action cannot be undone.")) return;

    try {
      await apiRequest({
        path: `/admin/careers/applications/${application.id}`,
        method: "DELETE",
      });
      window.location.href = "/careers/applications";
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error deleting application");
    }
  }

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (resumePreviewUrl) {
        URL.revokeObjectURL(resumePreviewUrl);
      }
    };
  }, [resumePreviewUrl]);

  if (loading) {
    return (
      <div className="space-y-6">
        <InlineLoadingCard lines={6} />
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/careers/applications">
            <Button variant="ghost">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <PageHeader
            title="Application Not Found"
            description={error ?? "The requested application does not exist."}
          />
        </div>
      </div>
    );
  }

  const statusInfo = STATUS_DETAILS[application.status];
  const StatusIcon = statusInfo.icon;
  const isPdf = application.resumeMimeType === "application/pdf";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/careers/applications">
          <Button variant="ghost">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <PageHeader
            title={application.fullName}
            description={`Application for ${application.career?.name ?? "Unknown Position"}`}
          />
        </div>
        <div className="flex items-center gap-3">
          <Badge value={application.status} className="!text-xs !px-3 !py-1.5">
            {humanizeToken(application.status)}
          </Badge>
          <Button variant="danger" onClick={handleDeleteApplication}>
            Delete Application
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column — Application Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Applicant Info */}
          <Card className="p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-4">
              Applicant Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
              <InfoRow
                icon={User}
                label="Full Name"
                value={application.fullName}
              />
              <InfoRow
                icon={Mail}
                label="Email"
                value={application.email}
                href={`mailto:${application.email}`}
              />
              <InfoRow
                icon={Phone}
                label="Phone"
                value={application.phone}
                href={`tel:${application.phone}`}
              />
              <InfoRow
                icon={Briefcase}
                label="Position"
                value={application.career?.name ?? "Unknown"}
              />
              <InfoRow
                icon={Calendar}
                label="Applied On"
                value={formatDateTime(application.createdAt)}
              />
              {application.reviewedAt && (
                <InfoRow
                  icon={ClipboardCheck}
                  label="Last Reviewed"
                  value={formatDateTime(application.reviewedAt)}
                />
              )}
            </div>

            <div className="pt-5 border-t border-[var(--border-soft)]">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
                Experience Summary
              </h3>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {application.experienceSummary || "No experience summary provided."}
              </p>
            </div>
          </Card>

          {/* Resume Section */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">
                Resume
              </h2>
              <div className="flex gap-2">
                {isPdf && (
                  <Button
                    variant="secondary"
                    onClick={handleResumePreview}
                    className="!text-xs"
                  >
                    <FileText className="w-3.5 h-3.5 mr-1.5" />
                    {resumePreviewUrl ? "Hide Preview" : "Preview"}
                  </Button>
                )}
                <Button
                  variant="primary"
                  onClick={handleResumeDownload}
                  className="!text-xs"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Download
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-muted">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {application.resumeOriginalName}
                </p>
                <p className="text-xs text-text-muted">
                  {formatFileSize(application.resumeSize)} ·{" "}
                  {application.resumeMimeType === "application/pdf"
                    ? "PDF"
                    : application.resumeMimeType ===
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      ? "DOCX"
                      : "DOC"}
                </p>
              </div>
            </div>

            {/* PDF Preview */}
            {resumePreviewUrl && isPdf && (
              <div className="mt-4 rounded-xl overflow-hidden border border-[var(--border-soft)]">
                <iframe
                  src={resumePreviewUrl}
                  className="w-full h-[600px]"
                  title="Resume Preview"
                />
              </div>
            )}
          </Card>
        </div>

        {/* Right Column — Status Management */}
        <div className="space-y-6">
          {/* Current Status */}
          <Card className="p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-4">
              Application Status
            </h2>
            <div
              className={`p-4 rounded-xl bg-${statusInfo.variant}-surface/50 border border-[var(--border-soft)]`}
            >
              <div className="flex items-center gap-2.5 mb-2">
                <StatusIcon className={`w-5 h-5 text-${statusInfo.variant}`} />
                <span className="font-semibold text-foreground">
                  {statusInfo.label}
                </span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                {statusInfo.description}
              </p>
            </div>
          </Card>

          {/* Status Actions */}
          <Card className="p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-4">
              Update Status
            </h2>
            <div className="space-y-2">
              {ALL_STATUSES.map((s) => {
                const info = STATUS_DETAILS[s];
                const Icon = info.icon;
                const isActive = application.status === s;

                return (
                  <button
                    key={s}
                    type="button"
                    disabled={isActive || updatingStatus}
                    onClick={() => handleStatusChange(s)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-medium transition-all ${
                      isActive
                        ? "bg-primary/10 text-primary border border-primary/20 cursor-default"
                        : "bg-surface-muted text-text-secondary hover:bg-surface-soft hover:text-foreground border border-transparent"
                    } disabled:opacity-50`}
                  >
                    <Icon
                      className={`w-4 h-4 ${isActive ? "text-primary" : ""}`}
                    />
                    <span className="flex-1">{info.label}</span>
                    {isActive && (
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-primary">
                        Current
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-4">
              Quick Actions
            </h2>
            <div className="space-y-2">
              <a
                href={`mailto:${application.email}?subject=Regarding your application for ${application.career?.name ?? "our position"}`}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-medium bg-surface-muted text-text-secondary hover:bg-surface-soft hover:text-foreground transition-all"
              >
                <Mail className="w-4 h-4" />
                Send Email
              </a>
              <a
                href={`tel:${application.phone}`}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-medium bg-surface-muted text-text-secondary hover:bg-surface-soft hover:text-foreground transition-all"
              >
                <Phone className="w-4 h-4" />
                Call Applicant
              </a>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof User;
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-surface-muted flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-text-muted" />
      </div>
      <div>
        <p className="text-xs text-text-muted">{label}</p>
        {href ? (
          <a
            href={href}
            className="text-sm font-medium text-primary hover:underline"
          >
            {value}
          </a>
        ) : (
          <p className="text-sm font-medium text-foreground">{value}</p>
        )}
      </div>
    </div>
  );
}
