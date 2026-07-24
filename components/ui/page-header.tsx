type PageHeaderProps = {
  title: string;
  description: string;
  meta?: string;
};

export function PageHeader({ title, description, meta }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        {meta ? <span className="text-xs text-text-muted">{meta}</span> : null}
      </div>
      <div className="max-w-4xl">
        <h1 className="font-display text-xl font-semibold leading-[1.25] tracking-[-0.03em] text-foreground md:text-2xl">
          {title}
        </h1>
        <p className="mt-1 max-w-3xl text-sm leading-5 text-text-secondary">
          {description}
        </p>
      </div>
    </div>
  );
}
