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
        description={
          isDirector
            ? "Workspace preferences, express booking charges, brochure uploads, and social links."
            : "Workspace preferences and express booking charges."
        }
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
              <Link href="/banners" className="underline-offset-4 hover:underline">
                Home Banners Carousel
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

      <ExpressDeliverySettings />

      {isDirector ? <SocialMediaSettings /> : null}
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
        const res = await apiRequest<any>({
          path: "/admin/settings/social_links",
          method: "GET",
        });
        const val = res?.value ?? res?.data?.value;
        if (val) {
          setLinks((prev) => ({ ...prev, ...val }));
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

function ExpressDeliverySettings() {
  const [settings, setSettings] = useState({
    fee: 70,
    enabled: true,
    label: "Express Arrival Promise",
    deliveryTimeEstimate: "Within ~2 hours",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Fetch initial express settings
  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const res = await apiRequest<any>({
          path: "/admin/settings/express_delivery",
          method: "GET",
        });
        const val = res?.value ?? res?.data?.value;
        if (val) {
          setSettings((prev) => ({
            ...prev,
            ...val,
            fee: Number(val.fee ?? 70),
            enabled: val.enabled !== false,
          }));
        }
      } catch (error) {
        console.error("Failed to fetch express delivery settings", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await apiRequest({
        path: "/admin/settings/express_delivery",
        method: "PUT",
        body: {
          value: {
            ...settings,
            fee: Number(settings.fee) || 0,
          },
        },
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      alert(error.message || "Failed to save express settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="space-y-4 p-5 md:p-6 border-[var(--border-soft)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-soft)] pb-4">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <span>⚡</span> Express Booking & Arrival Promise Surcharge
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Configure extra charges applied when customers choose Instant / ASAP express bookings. This fee is automatically itemized on the tax invoice and booking breakdown.
          </p>
        </div>
        <span className="inline-flex items-center rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400 border border-amber-500/30">
          ⚡ Priority Arrival
        </span>
      </div>

      {isLoading ? (
        <p className="text-sm text-text-secondary">Loading preferences...</p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl bg-surface-muted p-4 border border-[var(--border-soft)]">
            <div>
              <p className="text-sm font-medium text-foreground">Enable Express Booking</p>
              <p className="text-xs text-text-secondary mt-0.5">
                Allow customers to choose ASAP / Instant booking with arrival promise.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Express Extra Charge (₹)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-text-muted font-bold">
                  ₹
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="70"
                  value={settings.fee}
                  onChange={(e) => setSettings({ ...settings, fee: Math.max(0, Number(e.target.value)) })}
                  className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-text-secondary">
                Flat additional charge added directly to the total when booking ASAP (Default: ₹70).
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Display Label on Invoice & Bill
              </label>
              <input
                type="text"
                placeholder="Express Arrival Promise"
                value={settings.label}
                onChange={(e) => setSettings({ ...settings, label: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
              <p className="text-[11px] text-text-secondary">
                Line item description shown on the customer app bill summary and PDF tax invoice.
              </p>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium text-foreground">
                Arrival Promise Window Estimate
              </label>
              <input
                type="text"
                placeholder="Within ~2 hours"
                value={settings.deliveryTimeEstimate}
                onChange={(e) => setSettings({ ...settings, deliveryTimeEstimate: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
              <p className="text-[11px] text-text-secondary">
                Customer-facing time commitment shown on the booking screen.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-[var(--border-soft)]">
        {saveSuccess ? (
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            ✓ Express settings saved successfully!
          </span>
        ) : <span />}
        <button
          onClick={handleSave}
          disabled={isLoading || isSaving}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
        >
          {isSaving ? "Saving..." : "Save Express Settings"}
        </button>
      </div>
    </Card>
  );
}
