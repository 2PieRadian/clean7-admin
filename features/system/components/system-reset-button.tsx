"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useSystemReset } from "@/features/system/api/system-api";
import { useState } from "react";

export function SystemResetButton() {
  const { mutateAsync, isPending } = useSystemReset();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="danger" disabled={isPending}>
            {isPending ? "Resetting..." : "Reset System Data"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all catalog,
              orders, and branch data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-danger text-white hover:bg-danger-hover"
              onClick={() => {
                setError(null);
                setSuccess(null);
                mutateAsync()
                  .then(() => setSuccess("System data has been successfully reset."))
                  .catch((err) => setError(err instanceof Error ? err.message : "Failed to reset system data."));
              }}
            >
              Confirm Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {error && <p className="text-sm text-danger">{error}</p>}
      {success && <p className="text-sm text-green-500">{success}</p>}
    </div>
  );
}
