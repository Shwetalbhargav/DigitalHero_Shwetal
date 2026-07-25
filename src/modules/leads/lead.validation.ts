import { z } from "zod";

import { LEAD_BUDGET_RANGES, LEAD_STATUSES } from "./lead.types";

export const createLeadSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  budgetRange: z.enum(LEAD_BUDGET_RANGES),
  message: z.string().trim().min(1).max(5_000),
});

export const leadStatusSchema = z.enum(LEAD_STATUSES);
