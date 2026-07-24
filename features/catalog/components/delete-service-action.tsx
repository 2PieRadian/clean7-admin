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
import { useDeleteService } from "../api/catalog-api";

export function DeleteServiceAction({ serviceId, serviceName }: { serviceId: string, serviceName: string }) {
  const deleteService = useDeleteService();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="danger" disabled={deleteService.isPending}>
          {deleteService.isPending ? "..." : "Delete"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {serviceName}?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the service, along with its add-ons, geo-overrides, and variants/items.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-danger text-white hover:bg-danger-hover"
            onClick={() => {
              deleteService.mutateAsync(serviceId).catch((err) => {
                alert(err instanceof Error ? err.message : "Failed to delete service.");
              });
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
