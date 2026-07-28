import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: [".env.local", ".env"], quiet: true });

const CLIENT_ASSET_ROOT = join(process.cwd(), ".next", "static");
const FORBIDDEN_MARKERS = [
  "-----BEGIN PRIVATE KEY-----",
  "-----BEGIN RSA PRIVATE KEY-----",
  "-----BEGIN EC PRIVATE KEY-----",
  "scrypt$16384$8$1$",
];
const SERVER_SECRET_NAMES = [
  "MONGODB_URI",
  "ADMIN_PASSWORD",
  "SESSION_SECRET",
] as const;

function filesBelow(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? filesBelow(path) : [path];
  });
}

function configuredSecrets(): string[] {
  return SERVER_SECRET_NAMES.flatMap((name) => {
    const value = process.env[name];
    return value ? [value] : [];
  });
}

function auditEnvironment(): string[] {
  return SERVER_SECRET_NAMES.flatMap((name) =>
    process.env[`NEXT_PUBLIC_${name}`]
      ? [`NEXT_PUBLIC_${name} must not be configured.`]
      : [],
  );
}

function auditClientAssets(): string[] {
  if (!existsSync(CLIENT_ASSET_ROOT)) {
    return ["Run the production build before the security audit."];
  }

  const secrets = configuredSecrets();
  return filesBelow(CLIENT_ASSET_ROOT).flatMap((path) => {
    const contents = readFileSync(path, "utf8");
    const findings = FORBIDDEN_MARKERS.filter((marker) =>
      contents.includes(marker),
    ).map(() => `${path} contains forbidden secret material.`);
    if (secrets.some((secret) => contents.includes(secret))) {
      findings.push(`${path} contains a configured server secret.`);
    }
    return findings;
  });
}

const findings = [...auditEnvironment(), ...auditClientAssets()];
if (findings.length > 0) {
  throw new Error(`Production secret audit failed:\n${findings.join("\n")}`);
}

console.info("Production secret audit passed.");
