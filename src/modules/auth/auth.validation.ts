import { z } from "zod";

export const loginSchema = z
  .object({
    email: z.string().trim().email().max(254),
    password: z.string().min(1).max(128),
    remember: z.boolean().optional().default(false),
  })
  .strict();

export type LoginInput = z.infer<typeof loginSchema>;
