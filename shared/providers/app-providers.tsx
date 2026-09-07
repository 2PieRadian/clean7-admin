"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/shared/api/query-client";
import { ReactNode, useEffect } from "react";
import { useAuthStore } from "@/features/auth/store/auth-store";

function AuthBootstrap({ children }: { children: ReactNode }) {
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hostname === "127.0.0.1") {
      window.location.hostname = "localhost";
      return;
    }
    void bootstrap();
  }, [bootstrap]);

  return <>{children}</>;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap>{children}</AuthBootstrap>
    </QueryClientProvider>
  );
}
