"use client";

import {
  useState,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { Eye, EyeOff } from "lucide-react";

type BaseProps = {
  label: string;
  hint?: string;
};

export function Field({
  label,
  hint,
  className = "",
  ...props
}: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = props.type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : props.type;

  return (
    <label className="flex flex-col gap-1 text-sm text-text-secondary">
      <span className="font-medium text-foreground">{label}</span>
      <div className="relative">
        <input
          className={`input-surface w-full px-2.5 py-1.5 text-sm text-foreground outline-none transition pr-10 ${className}`}
          {...props}
          type={inputType}
        />
        {isPassword && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-foreground"
            onClick={(e) => {
              e.preventDefault();
              setShowPassword(!showPassword);
            }}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {hint ? <span className="text-xs text-text-muted">{hint}</span> : null}
    </label>
  );
}

export function TextArea({
  label,
  hint,
  className = "",
  ...props
}: BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="flex flex-col gap-1 text-sm text-text-secondary">
      <span className="font-medium text-foreground">{label}</span>
      <textarea
        className={`input-surface min-h-22 px-2.5 py-2 text-sm text-foreground outline-none transition ${className}`}
        {...props}
      />
      {hint ? <span className="text-xs text-text-muted">{hint}</span> : null}
    </label>
  );
}

export function Select({
  label,
  hint,
  className = "",
  children,
  ...props
}: BaseProps & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="flex flex-col gap-1 text-sm text-text-secondary">
      <span className="font-medium text-foreground">{label}</span>
      <select
        className={`input-surface px-2.5 py-1.5 text-sm text-foreground outline-none transition ${className}`}
        {...props}
      >
        {children}
      </select>
      {hint ? <span className="text-xs text-text-muted">{hint}</span> : null}
    </label>
  );
}
