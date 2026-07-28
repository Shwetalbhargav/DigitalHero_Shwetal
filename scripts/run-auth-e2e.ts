import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

import { MongoMemoryServer } from "mongodb-memory-server";

async function main(): Promise<void> {
  const runId = randomBytes(6).toString("hex");
  const databaseName = `leaddesk-e2e-${runId}`;
  const mongo = await MongoMemoryServer.create({
    instance: { dbName: databaseName },
  });
  const playwrightCli = join(
    process.cwd(),
    "node_modules",
    "@playwright",
    "test",
    "cli.js",
  );

  try {
    const result = spawnSync(process.execPath, [playwrightCli, "test"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        MONGODB_URI: mongo.getUri(),
        MONGODB_DB_NAME: databaseName,
        E2E_ADMIN_EMAIL: `admin-${runId}@example.test`,
        E2E_ADMIN_PASSWORD: randomBytes(24).toString("base64url"),
      },
      stdio: "inherit",
    });

    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  } finally {
    await mongo.stop();
  }
}

void main();
