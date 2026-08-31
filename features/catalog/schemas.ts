import { z } from "zod";

export const categorySchema = z.object({
  code: z.string().optional(),
  slug: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
  iconUrl: z.string().optional().nullable(),
  appImageUrl: z.string().optional().nullable(),
  webImageUrl: z.string().optional().nullable(),
  sortOrder: z.coerce.number().default(0),
  publishState: z.enum(["DRAFT", "ACTIVE", "INACTIVE"]),
  changeSummary: z.string().optional(),
});

export const serviceSchema = z.object({
  categoryId: z.string().optional().default(""),
  code: z.string().optional(),
  slug: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  shortDescription: z.string().optional().nullable(),
  longDescription: z.string().optional().nullable(),
  appImageUrl: z.string().optional().nullable(),
  webImageUrl: z.string().optional().nullable(),
  serviceMode: z.enum(["PICKUP_DELIVERY", "AT_HOME"]),
  durationEstimateMinutes: z.coerce.number().optional().nullable(),
  sortOrder: z.coerce.number().default(0),
  publishState: z.enum(["DRAFT", "ACTIVE", "INACTIVE"]),
  changeSummary: z.string().optional(),
});

export const itemSchema = z.object({
  serviceId: z.string().min(1, "Service is required"),
  code: z.string().optional(),
  slug: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  pricingType: z.string().min(1, "Pricing type is required"),
  basePrice: z.coerce.number().min(0, "Price must be positive"),
  currency: z.string().default("INR"),
  unitLabel: z.string().optional().nullable(),
  minQty: z.coerce.number().optional().nullable(),
  maxQty: z.coerce.number().optional().nullable(),
  sortOrder: z.coerce.number().default(0),
  publishState: z.enum(["DRAFT", "ACTIVE", "INACTIVE"]),
  changeSummary: z.string().optional(),
});

export const addOnSchema = z.object({
  serviceId: z.string().min(1, "Service is required"),
  code: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
  pricingType: z.literal("ADD_ON"),
  price: z.coerce.number().min(0, "Price must be positive"),
  currency: z.string().default("INR"),
  unitLabel: z.string().optional().nullable(),
  maxQty: z.coerce.number().optional().nullable(),
  sortOrder: z.coerce.number().default(0),
  publishState: z.enum(["DRAFT", "ACTIVE", "INACTIVE"]),
  changeSummary: z.string().optional(),
});
