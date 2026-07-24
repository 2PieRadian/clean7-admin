import { z } from "zod";
import { indianStates } from "@/lib/constants";

export const branchCreateSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  city: z.string().optional().nullable(),
  state: z.enum(indianStates as unknown as [string, ...string[]]).optional().nullable(),
  addressLine1: z.string().optional().nullable(),
  addressLine2: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  serviceRadiusKm: z.coerce.number().min(0.1).default(8),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  assignedBranchAdminAuthUserId: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const branchUpdateSchema = branchCreateSchema;
