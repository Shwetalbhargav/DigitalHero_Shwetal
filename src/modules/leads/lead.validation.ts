import { z } from "zod";

import {
  LEAD_BUDGET_RANGES,
  LEAD_SORTS,
  LEAD_STATUSES,
} from "./lead.types";

export const createLeadSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  budgetRange: z.enum(LEAD_BUDGET_RANGES),
  message: z.string().trim().min(1).max(5_000),
});

export const leadStatusSchema = z.enum(LEAD_STATUSES);

export const leadListQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  status: leadStatusSchema.optional(),
  sort: z.enum(LEAD_SORTS).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const updateLeadStatusSchema = z
  .object({ status: leadStatusSchema })
  .strict();
