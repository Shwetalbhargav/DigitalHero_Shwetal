import dotenv from "dotenv";

dotenv.config({ path: [".env.local", ".env"], quiet: true });

async function main(): Promise<void> {
  const [
    { parseAdminSeedEnv },
    { getMongoClient, getDatabase },
    { setupAuthCollections },
    { createMongoAuthRepository },
  ] = await Promise.all([
    import("../src/config/env"),
    import("../src/infrastructure/database/mongodb"),
    import("../src/infrastructure/database/auth-collections"),
    import("../src/modules/auth/auth.repository"),
  ]);
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = parseAdminSeedEnv(process.env);
  const client = await getMongoClient();

  try {
    await setupAuthCollections(await getDatabase());
    const repository = createMongoAuthRepository();
    const user = await repository.provisionAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
    process.stdout.write(`Admin identity ready for ${user.normalizedEmail}.\n`);
  } finally {
    await client.close();
  }
}

void main();
