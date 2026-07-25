"use client";

import { BlogList } from "@/features/blogs/components/blog-list";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/features/auth/store/auth-store";

export default function BlogsPage() {
  const { user } = useAuth();
  const isDirector = user?.role === "DIRECTOR";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Blogs"
          description="Manage and publish articles for your customers"
        />
        {isDirector && (
          <Link href="/blogs/create">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Blog
            </Button>
          </Link>
        )}
      </div>
      <BlogList />
    </div>
  );
}
