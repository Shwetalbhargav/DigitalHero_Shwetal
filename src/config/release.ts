import { z } from "zod";

import { adminSeedEnvSchema, serverEnvSchema } from "./env";

const releaseBaseUrlSchema = z
  .string()
  .trim()
  .url("RELEASE_BASE_URL must be an absolute URL.")
  .transform((value) => new URL(value))
  .refine(
    (url) =>
      url.protocol === "https:" ||
      (url.protocol === "http:" &&
        (url.hostname === "localhost" || url.hostname === "127.0.0.1")),
    "RELEASE_BASE_URL must use HTTPS outside localhost.",
  )
  .refine(
    (url) => !url.username && !url.password,
    "RELEASE_BASE_URL must not contain credentials.",
  )
  .transform((url) => {
    url.pathname = "/";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  });

export const productionReleaseEnvSchema = serverEnvSchema
  .and(adminSeedEnvSchema)
  .and(
    z.object({
      RELEASE_BASE_URL: releaseBaseUrlSchema,
    }),
  );

export type ProductionReleaseEnv = z.infer<
  typeof productionReleaseEnvSchema
>;

export function parseProductionReleaseEnv(
  source: Record<string, string | undefined>,
): ProductionReleaseEnv {
  return productionReleaseEnvSchema.parse(source);
}
