"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GeoOverridesPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/branch-services");
  }, [router]);

  return (
    <div className="p-8 text-sm text-text-muted">
      Redirecting to Branch-wise Services...
    </div>
  );
}
