"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Field, TextArea, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";
import type { SimpleEditorRef } from "@/components/tiptap-templates/simple/simple-editor";
import { useCreateBlog, useUpdateBlog, type Blog } from "../api/blogs-api";
import { handleImageUpload } from "@/lib/tiptap-utils";

interface BlogFormProps {
  initialData?: Blog;
}

export function BlogForm({ initialData }: BlogFormProps) {
  const router = useRouter();
  const isEditing = !!initialData;
  const editorRef = useRef<SimpleEditorRef>(null);

  const createBlog = useCreateBlog();
  const updateBlog = useUpdateBlog();

  const [title, setTitle] = useState(initialData?.title || "");
  const [authorName, setAuthorName] = useState(initialData?.authorName || "");
  const [excerpt, setExcerpt] = useState(initialData?.excerpt || "");
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || "");
  const [category, setCategory] = useState(initialData?.category || "CAR_WASH");
  const [status, setStatus] = useState(initialData?.status || "DRAFT");

  const [error, setError] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingImage(true);
      setError(null);
      const url = await handleImageUpload(file);
      setImageUrl(url);
    } catch (err: any) {
      setError(err.message || "Failed to upload image");
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const content = editorRef.current?.getContent();
    if (!content || editorRef.current?.isEmpty()) {
      setError("Article content is required");
      return;
    }

    try {
      const payload = {
        title,
        authorName,
        excerpt,
        imageUrl,
        category: category as Blog["category"],
        status: status as Blog["status"],
        content: JSON.stringify(content), // Tiptap JSON content or HTML string, but tiptap getJSON returns an object. Let's send as string to match schema text. Wait, simple-editor.tsx handles it.
      };

      // Wait, in schema, content is `String @db.Text`. We can just store JSON as string.
      const contentStr =
        typeof content === "object" ? JSON.stringify(content) : content;

      if (isEditing) {
        await updateBlog.mutateAsync({
          id: initialData.id,
          ...payload,
          content: contentStr as string,
        });
      } else {
        await createBlog.mutateAsync({
          ...payload,
          content: contentStr as string,
        });
      }

      router.push("/blogs");
    } catch (err: any) {
      setError(err.message || "Failed to save blog");
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="mb-6">
        <Link
          href="/blogs"
          className="inline-flex items-center text-sm font-medium text-text-muted hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Blogs
        </Link>
        <h1 className="text-2xl font-bold">
          {isEditing ? "Edit Blog" : "Create Blog"}
        </h1>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl border border-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field
              label="Title *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <Field
              label="Author Name *"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[14px] font-medium leading-[1.25] text-foreground">
              Cover Image URL
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="flex h-11 w-full rounded-2xl border border-[var(--border-soft)] bg-surface px-4 py-3 text-[14px] text-foreground placeholder-[var(--text-muted)] shadow-[var(--shadow-input)] transition-all hover:border-[var(--border-hover)] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={onFileChange}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage}
                >
                  {isUploadingImage ? "Uploading..." : "Upload File"}
                </Button>
              </div>
            </div>
            {imageUrl && (
              <div className="mt-3">
                <img
                  src={imageUrl}
                  alt="Cover Preview"
                  className="max-h-40 rounded-xl object-cover"
                />
              </div>
            )}
          </div>

          <TextArea
            label="Excerpt"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            rows={3}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value as Blog["category"])}
            >
              <option value="CAR_WASH">Car Wash</option>
              <option value="HOUSE_HELP">House Help</option>
              <option value="LAUNDRY">Laundry</option>
            </Select>

            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as Blog["status"])}
            >
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active (Published)</option>
              <option value="INACTIVE">Inactive (Hidden)</option>
            </Select>
          </div>
        </Card>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Content *
          </label>
          <div className="bg-surface rounded-xl border border-[var(--border-soft)] shadow-sm">
            <SimpleEditor
              ref={editorRef}
              initialContent={
                initialData?.content
                  ? // Try parsing JSON, otherwise fallback to HTML
                    (() => {
                      try {
                        return JSON.parse(initialData.content);
                      } catch {
                        return initialData.content;
                      }
                    })()
                  : undefined
              }
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-[var(--border-soft)]">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/blogs")}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createBlog.isPending || updateBlog.isPending}
          >
            {createBlog.isPending || updateBlog.isPending
              ? "Saving..."
              : "Save Blog"}
          </Button>
        </div>
      </form>
    </div>
  );
}
