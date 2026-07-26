import type { Metadata } from "next";
import { Calendar, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { generateHTML } from "@tiptap/html/server";
import { StarterKit } from "@tiptap/starter-kit";
import { Image as TiptapImage } from "@tiptap/extension-image";
import { TaskList, TaskItem } from "@tiptap/extension-list";
import { TextAlign } from "@tiptap/extension-text-align";
import { Typography } from "@tiptap/extension-typography";
import { Highlight } from "@tiptap/extension-highlight";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";

import { Inter, Fraunces } from "next/font/google";
import { ThemeToggle } from "@/components/tiptap-templates/simple/theme-toggle";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
});

async function getBlog(slug: string) {
  try {
    const res = await fetch(`https://api.clean7.in/catalog/blogs/${slug}`, {
      next: { revalidate: 60 },
    });
    const json = await res.json();
    if (json.success && json.data) {
      return json.data;
    }
    return null;
  } catch (error) {
    console.error("Failed to fetch blog", error);
    return null;
  }
}

export default async function BlogPreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = await params;
  const blog = await getBlog(resolvedParams.slug);

  if (!blog) {
    notFound();
  }

  let htmlContent = blog.content;
  try {
    const jsonContent = JSON.parse(blog.content);
    htmlContent = generateHTML(jsonContent, [
      StarterKit,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TiptapImage,
      TaskList,
      TaskItem.configure({ nested: true }),
      Typography,
      Highlight.configure({ multicolor: true }),
      Subscript,
      Superscript,
    ]);
  } catch (e) {
    console.error("Error parsing blog content:", e);
    // Fallback if content is already HTML or not JSON
  }

  const formatCategory = (cat: string) => {
    return cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div
      className={`blog-preview-container overflow-clip min-h-[calc(100vh-100px)] flex flex-col rounded-[24px] shadow-sm border border-[var(--line)] bg-[var(--ground)] ${inter.variable} ${fraunces.variable} font-sans`}
    >
      <main className="flex-grow pt-12 pb-20 px-6 sm:px-12 md:px-20 lg:px-32">
        <div className="max-w-[800px] mx-auto">
          <div className="flex items-center justify-between mb-8">
            {/* Back button */}
            <Link
              href="/blogs"
              className="inline-flex items-center gap-2 text-[var(--ink-soft)] hover:text-[var(--gold)] transition-colors font-medium"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Blogs
            </Link>

            {/* Theme Toggle */}
            <div className="flex items-center gap-3 bg-[var(--surface)] px-2 py-1 rounded-full shadow-sm border border-[var(--line)]">
              <span className="text-[12px] text-[var(--ink-soft)] font-medium pl-2">
                Preview Mode
              </span>
              <ThemeToggle />
            </div>
          </div>

          {/* Article Header */}
          <div className="mb-10">
            <div className="flex items-center gap-2 text-[var(--gold)] text-[13px] font-bold mb-5 uppercase tracking-widest">
              <span>{formatCategory(blog.category)}</span>
              <span className="text-[var(--ink-soft)] mx-2 opacity-50">·</span>
              <Calendar className="w-4 h-4" />
              <span>
                {new Date(blog.createdAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
            <h1 className="text-4xl md:text-[48px] font-bold font-serif mb-6 text-[var(--ink)] leading-[1.15] tracking-tight">
              {blog.title}
            </h1>
            <p className="text-[20px] text-[var(--ink-soft)] leading-relaxed mb-8">
              {blog.excerpt}
            </p>
          </div>

          {/* Featured Image */}
          {blog.imageUrl && (
            <div className="w-full h-[320px] md:h-[480px] relative rounded-[24px] overflow-hidden mb-16 shadow-lg border border-[var(--line)]">
              <img
                src={blog.imageUrl}
                alt={blog.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Content */}
          <div
            className="blog-content"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>
      </main>
    </div>
  );
}
