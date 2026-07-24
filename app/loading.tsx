import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/loading-state";

export default function Loading() {
  return (
    <div className="page-shell flex min-h-[100svh] items-center justify-center px-4">
      <Card className="w-full max-w-md space-y-5 rounded-[28px] p-8">
        <div className="flex items-center gap-3">
          <div className="skeleton h-12 w-12 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </Card>
    </div>
  );
}
