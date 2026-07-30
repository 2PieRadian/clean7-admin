"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { InlineLoadingCard } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { apiRequest } from "@/lib/browser-api";
import type { Career } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Field, TextArea } from "@/components/ui/field";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import Link from "next/link";
import { ArrowRight, Plus, Pencil, Trash2, Users } from "lucide-react";

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
  const [saving, setSaving] = useState(false);

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
    setSaving(true);
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
    } finally {
      setSaving(false);
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

  async function handleDelete(id: string) {
    try {
      await apiRequest({
        path: `/admin/careers/${id}`,
        method: "DELETE",
      });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error deleting career");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Careers"
          description="Manage job postings and see applications."
        />
        <div className="flex gap-3">
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
            <Field
              label="Job Title"
              required
              value={formData.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g. Delivery Driver"
            />
            <TextArea
              label="Description"
              required
              value={formData.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={4}
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="hasVacancies"
                className="h-4 w-4 rounded border-gray-300 text-primary accent-primary"
                checked={formData.hasVacancies}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, hasVacancies: e.target.checked })
                }
              />
              <label htmlFor="hasVacancies" className="text-sm font-medium">
                Active (Visible on website)
              </label>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
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
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-medium">{career.name}</h3>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${career.hasVacancies ? "bg-success/10 text-success" : "bg-surface-soft text-text-muted"}`}
                  >
                    {career.hasVacancies ? "Active" : "Hidden"}
                  </span>
                </div>
                <p className="text-sm text-text-secondary mt-1 line-clamp-2 max-w-2xl">
                  {career.description}
                </p>
                {career._count != null && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-text-muted">
                    <Users className="w-3.5 h-3.5" />
                    <span>
                      {career._count.applications}{" "}
                      {career._count.applications === 1
                        ? "application"
                        : "applications"}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 ml-4 shrink-0">
                <Button variant="ghost" onClick={() => handleEdit(career)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost">
                      <Trash2 className="w-4 h-4 text-danger" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Career</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete &quot;{career.name}&quot;?
                        This will also permanently remove all associated
                        applications and resume files.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="!bg-danger !text-white"
                        onClick={() => handleDelete(career.id)}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </Card>
          ))}
          {careers.length === 0 && (
            <div className="text-center p-12 text-text-muted">
              No careers created yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
