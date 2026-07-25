import { z } from "zod";

import { LEAD_BUDGET_RANGES, LEAD_STATUSES } from "./lead.types";

export const createLeadSchema = z.object({
  name: z
    .string({ error: "Enter your name." })
    .trim()
    .min(1, "Enter your name.")
    .max(120, "Name must be 120 characters or fewer."),
  email: z
    .string({ error: "Enter a valid email address." })
    .trim()
    .toLowerCase()
    .email("Enter a valid email address.")
    .max(254, "Email must be 254 characters or fewer."),
  budgetRange: z.enum(LEAD_BUDGET_RANGES, {
    error: "Select a valid budget range.",
  }),
  message: z
    .string({ error: "Tell us about your project." })
    .trim()
    .min(1, "Tell us about your project.")
    .max(5_000, "Message must be 5,000 characters or fewer."),
}).strict();

export const leadStatusSchema = z.enum(LEAD_STATUSES);
