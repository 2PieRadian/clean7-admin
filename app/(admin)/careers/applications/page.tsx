"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { InlineLoadingCard } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { apiRequest } from "@/lib/browser-api";
import { CareerApplication } from "@/lib/types";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<CareerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await apiRequest<CareerApplication[]>({
        path: "/admin/careers/applications",
      });
      setApplications(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load applications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-4">
        <Link href="/careers">
          <Button variant="ghost">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <PageHeader
          title="Job Applications"
          description="View applicants and download resumes."
        />
      </div>

      {loading && <InlineLoadingCard lines={4} />}
      {error && (
        <Card>
          <p className="text-sm text-danger p-4">{error}</p>
        </Card>
      )}

      {!loading && !error && (
        <div className="grid gap-4">
          {applications.map((app) => (
            <Card key={app.id} className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium">{app.fullName}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Applied for:{" "}
                    <span className="font-medium text-foreground">
                      {app.career?.name || "Unknown Job"}
                    </span>
                  </p>
                  <div className="mt-4 space-y-1 text-sm text-muted-foreground">
                    <p>
                      Email:{" "}
                      <a
                        href={`mailto:${app.email}`}
                        className="text-primary hover:underline"
                      >
                        {app.email}
                      </a>
                    </p>
                    <p>
                      Phone:{" "}
                      <a
                        href={`tel:${app.phone}`}
                        className="text-primary hover:underline"
                      >
                        {app.phone}
                      </a>
                    </p>
                    <p>Date: {new Date(app.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-xs font-medium">
                    {app.status}
                  </span>
                  <a
                    href={`${process.env.NEXT_PUBLIC_API_URL}/uploads/resumes/${app.resumeStoredName}`}
                    target="_blank"
                    rel="noreferrer"
                    download
                  >
                    <Button variant="secondary">
                      <Download className="w-4 h-4 mr-2" /> Resume
                    </Button>
                  </a>
                </div>
              </div>
            </Card>
          ))}
          {applications.length === 0 && (
            <div className="text-center p-12 text-muted-foreground">
              No applications received yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
