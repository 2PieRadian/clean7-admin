"use client";

import * as React from "react";
import { X } from "lucide-react";

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-surface border border-[var(--border-soft)] rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200"
        role="dialog"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-[var(--border-soft)] bg-surface/80 backdrop-blur-md">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 sm:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
