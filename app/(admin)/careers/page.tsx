"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { InlineLoadingCard } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { apiRequest } from "@/lib/browser-api";
import { Career } from "@/lib/types";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Plus, Pencil } from "lucide-react";

export default function CareersPage() {
  const [careers, setCareers] = useState<Career[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    hasVacancies: true,
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await apiRequest<Career[]>({ path: "/admin/careers" });
      setCareers(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load careers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingId) {
        await apiRequest({
          path: `/admin/careers/${editingId}`,
          method: "PATCH",
          body: formData,
        });
      } else {
        await apiRequest({
          path: "/admin/careers",
          method: "POST",
          body: formData,
        });
      }
      setIsFormOpen(false);
      setFormData({ name: "", description: "", hasVacancies: true });
      setEditingId(null);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error saving career");
    }
  }

  function handleEdit(career: Career) {
    setFormData({
      name: career.name,
      description: career.description || "",
      hasVacancies: career.hasVacancies,
    });
    setEditingId(career.id);
    setIsFormOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Careers"
          description="Manage job postings and see applications."
        />
        <div className="flex gap-4">
          <Link href="/careers/applications">
            <Button variant="secondary">
              View Applications <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
          <Button
            onClick={() => {
              setFormData({ name: "", description: "", hasVacancies: true });
              setEditingId(null);
              setIsFormOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" /> Add Career
          </Button>
        </div>
      </div>

      {loading && <InlineLoadingCard lines={4} />}
      {error && (
        <Card>
          <p className="text-sm text-danger p-4">{error}</p>
        </Card>
      )}

      {isFormOpen && (
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">
            {editingId ? "Edit Career" : "New Career"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
            <div className="space-y-2 flex flex-col">
              <label className="text-sm font-medium">Job Title</label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g. Delivery Driver"
              />
            </div>
            <div className="space-y-2 flex flex-col">
              <label className="text-sm font-medium">Description</label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={4}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                checked={formData.hasVacancies}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, hasVacancies: e.target.checked })
                }
              />
              <label className="text-sm font-medium">
                Active (Visible on website)
              </label>
            </div>
            <div className="flex gap-2">
              <Button type="submit">Save</Button>
              <Button
                variant="secondary"
                type="button"
                onClick={() => setIsFormOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {!loading && !error && (
        <div className="grid gap-4">
          {careers.map((career) => (
            <Card
              key={career.id}
              className="p-6 flex items-center justify-between"
            >
              <div>
                <h3 className="text-lg font-medium">{career.name}</h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2 max-w-2xl">
                  {career.description}
                </p>
                <div className="mt-2 text-sm">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${career.hasVacancies ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}
                  >
                    {career.hasVacancies ? "Active" : "Hidden"}
                  </span>
                </div>
              </div>
              <Button variant="ghost" onClick={() => handleEdit(career)}>
                <Pencil className="w-4 h-4" />
              </Button>
            </Card>
          ))}
          {careers.length === 0 && (
            <div className="text-center p-12 text-muted-foreground">
              No careers created yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
