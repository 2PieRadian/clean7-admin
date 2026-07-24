"use client";

import * as React from "react";
import { Button } from "./button";

export function AlertDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);

  return (
    <AlertDialogContext.Provider value={{ open, setOpen }}>
      {children}
    </AlertDialogContext.Provider>
  );
}

const AlertDialogContext = React.createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
}>({ open: false, setOpen: () => {} });

export function AlertDialogTrigger({
  asChild,
  children,
}: {
  asChild?: boolean;
  children: React.ReactNode;
}) {
  const { setOpen } = React.useContext(AlertDialogContext);
  if (asChild && React.isValidElement(children)) {
    const element = children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>;
    return React.cloneElement(element, {
      onClick: (e: React.MouseEvent) => {
        if (element.props.onClick) element.props.onClick(e);
        setOpen(true);
      },
    });
  }
  return <button onClick={() => setOpen(true)}>{children}</button>;
}

export function AlertDialogContent({ children }: { children: React.ReactNode }) {
  const { open, setOpen } = React.useContext(AlertDialogContext);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-surface border border-[var(--border-soft)] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        role="alertdialog"
      >
        {children}
      </div>
    </div>
  );
}

export function AlertDialogHeader({ children }: { children: React.ReactNode }) {
  return <div className="p-6 space-y-2">{children}</div>;
}

export function AlertDialogTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-bold text-foreground">{children}</h2>;
}

export function AlertDialogDescription({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-text-secondary leading-relaxed">{children}</p>;
}

export function AlertDialogFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-6 pt-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
      {children}
    </div>
  );
}

export function AlertDialogCancel({ children }: { children: React.ReactNode }) {
  const { setOpen } = React.useContext(AlertDialogContext);
  return (
    <Button variant="secondary" onClick={() => setOpen(false)}>
      {children}
    </Button>
  );
}

export function AlertDialogAction({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const { setOpen } = React.useContext(AlertDialogContext);
  return (
    <Button
      className={className}
      onClick={() => {
        if (onClick) onClick();
        setOpen(false);
      }}
    >
      {children}
    </Button>
  );
}
