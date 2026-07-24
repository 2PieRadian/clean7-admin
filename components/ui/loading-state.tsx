import { Card } from "@/components/ui/card";

export function Skeleton({
  className = "",
}: {
  className?: string;
}) {
  return <div className={`skeleton rounded-full ${className}`} />;
}

export function InlineLoadingCard({
  lines = 3,
}: {
  lines?: number;
}) {
  return (
    <Card className="space-y-4">
      <Skeleton className="h-4 w-36" />
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={`h-4 ${index === lines - 1 ? "w-2/3" : "w-full"}`}
        />
      ))}
    </Card>
  );
}

export function PageLoadingState() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-11 w-3/5 max-w-[520px] rounded-2xl" />
        <Skeleton className="h-4 w-4/5 max-w-[680px]" />
        <Skeleton className="h-4 w-3/5 max-w-[560px]" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="space-y-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-20 rounded-2xl" />
            <Skeleton className="h-4 w-32" />
          </Card>
        ))}
      </div>

      <InlineLoadingCard lines={6} />
    </div>
  );
}
