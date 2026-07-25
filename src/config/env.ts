import { z } from "zod";

export const serverEnvSchema = z.object({
  MONGODB_URI: z
    .string()
    .trim()
    .min(1, "MONGODB_URI is required.")
    .refine(
      (value) =>
        value.startsWith("mongodb://") || value.startsWith("mongodb+srv://"),
      "MONGODB_URI must use the mongodb:// or mongodb+srv:// protocol.",
    ),
  MONGODB_DB_NAME: z
    .string()
    .trim()
    .min(1, "MONGODB_DB_NAME is required.")
    .max(63, "MONGODB_DB_NAME must be 63 characters or fewer.")
    .regex(
      /^[^/\\. "$*<>:|?]+$/,
      "MONGODB_DB_NAME contains unsupported characters.",
    ),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | undefined;

export function parseServerEnv(
  source: Record<string, string | undefined>,
): ServerEnv {
  return serverEnvSchema.parse(source);
}

export function getServerEnv(): ServerEnv {
  cachedEnv ??= parseServerEnv(process.env);
  return cachedEnv;
}
