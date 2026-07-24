"use client";

type MutationStatusProps = {
  error?: string | null;
  success?: string | null;
};

export function MutationStatus({ error, success }: MutationStatusProps) {
  if (!error && !success) return null;

  return (
    <p className={`text-sm ${error ? "text-danger" : "text-success"}`}>
      {error ?? success}
    </p>
  );
}
