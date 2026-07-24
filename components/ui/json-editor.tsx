"use client";

import { useState } from "react";
import { TextArea } from "@/components/ui/field";

type JsonEditorProps = {
  label: string;
  name: string;
  initialValue?: unknown;
  hint?: string;
};

export function JsonEditor({
  label,
  name,
  initialValue,
  hint,
}: JsonEditorProps) {
  const [value, setValue] = useState(() =>
    initialValue === undefined ? "" : JSON.stringify(initialValue, null, 2),
  );
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <TextArea
        label={label}
        name={name}
        value={value}
        onChange={(event) => {
          const nextValue = event.target.value;
          setValue(nextValue);

          if (!nextValue.trim()) {
            setError(null);
            return;
          }

          try {
            JSON.parse(nextValue);
            setError(null);
          } catch {
            setError("Enter valid JSON before saving.");
          }
        }}
        hint={hint}
      />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
