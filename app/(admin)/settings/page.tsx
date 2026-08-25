"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/features/auth/store/auth-store";
import { ThemeToggle } from "@/components/admin/theme-toggle";
import { apiRequest } from "@/lib/browser-api";

import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export default function SettingsPage() {
  const { user } = useAuth();
  const isDirector = user?.role === "DIRECTOR";
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleUploadBrochure = async () => {
    if (!file) return;
    setIsUploading(true);
    try {
      // 1. Get pre-signed URL
      const { uploadURL } = await apiRequest<{ uploadURL: string; fileURL: string }>({
        path: "/admin/upload/brochure",
        method: "POST",
        body: { fileType: file.type },
      });

      // 2. Upload file to S3
      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload to S3");
      }

      alert("Brochure uploaded successfully!");
      setFile(null);
    } catch (error: any) {
      alert(error.message || "Failed to upload brochure");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workspace preferences"
        description="Theme and quick links. There is no backend settings API in the contract—use branch and catalog screens for operational configuration."
      />

      <Card className="space-y-4 p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Appearance</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Light or dark color scheme is stored in this browser only.
            </p>
          </div>
          <ThemeToggle />
        </div>
      </Card>

      {isDirector ? (
        <Card className="space-y-3 p-5 md:p-6">
          <h2 className="text-base font-semibold text-foreground">Director tools</h2>
          <p className="text-sm text-text-secondary">
            Advanced user management routes are not in the main sidebar; open them here if
            needed.
          </p>
          <ul className="list-inside list-disc space-y-2 text-sm text-primary">
            <li>
              <Link href="/auth-users" className="underline-offset-4 hover:underline">
                Managed users
              </Link>
            </li>

            <li>
              <Link href="/profiles" className="underline-offset-4 hover:underline">
                Profile lookup (legacy path)
              </Link>
            </li>
          </ul>
        </Card>
      ) : null}

      {isDirector ? (
        <Card className="space-y-4 p-5 md:p-6">
          <div>
            <h2 className="text-base font-semibold text-foreground">Franchise Brochure</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Upload the PDF brochure that users can download from the franchise page.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="text-sm"
            />
            <button
              onClick={handleUploadBrochure}
              disabled={!file || isUploading}
              className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {isUploading ? "Uploading..." : "Upload Brochure"}
            </button>
          </div>
        </Card>
      ) : null}

      {isDirector ? (
        <Card className="space-y-4 p-5 md:p-6 border-danger">
          <div>
            <h2 className="text-base font-semibold text-danger">Danger Zone</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Irreversible destructive actions for the Clean7 system.
            </p>
          </div>

        </Card>
      ) : null}

      <SocialMediaSettings />
    </div>
  );
}

function SocialMediaSettings() {
  const [links, setLinks] = useState({
    instagram: "",
    facebook: "",
    linkedin: "",
    x: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch initial settings
  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const res = await apiRequest<{ data: any }>({
          path: "/admin/settings/social_links",
          method: "GET",
        });
        if (res.data && res.data.value) {
          setLinks((prev) => ({ ...prev, ...res.data.value }));
        }
      } catch (error) {
        console.error("Failed to fetch social links", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiRequest({
        path: "/admin/settings/social_links",
        method: "PUT",
        body: { value: links },
      });
      alert("Social media links saved successfully!");
    } catch (error: any) {
      alert(error.message || "Failed to save social media links");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="space-y-4 p-5 md:p-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Social Media Links</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Configure the social media URLs shown in the website footer.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-text-secondary">Loading...</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Instagram</label>
            <input
              type="url"
              placeholder="https://instagram.com/..."
              value={links.instagram}
              onChange={(e) => setLinks({ ...links, instagram: e.target.value })}
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Facebook</label>
            <input
              type="url"
              placeholder="https://facebook.com/..."
              value={links.facebook}
              onChange={(e) => setLinks({ ...links, facebook: e.target.value })}
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">LinkedIn</label>
            <input
              type="url"
              placeholder="https://linkedin.com/in/..."
              value={links.linkedin}
              onChange={(e) => setLinks({ ...links, linkedin: e.target.value })}
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">X (Twitter)</label>
            <input
              type="url"
              placeholder="https://x.com/..."
              value={links.x}
              onChange={(e) => setLinks({ ...links, x: e.target.value })}
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={isLoading || isSaving}
          className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save Links"}
        </button>
      </div>
    </Card>
  );
}
