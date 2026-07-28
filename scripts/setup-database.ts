import dotenv from "dotenv";

dotenv.config({ path: [".env.local", ".env"], quiet: true });

async function main(): Promise<void> {
  const [
    { getMongoClient, getDatabase },
    { setupLeadsCollection },
    { setupAuthCollections },
  ] = await Promise.all([
      import("../src/infrastructure/database/mongodb"),
      import("../src/infrastructure/database/leads-collection"),
      import("../src/infrastructure/database/auth-collections"),
    ]);

  const client = await getMongoClient();

  try {
    const database = await getDatabase();
    await setupLeadsCollection(database);
    await setupAuthCollections(database);
    process.stdout.write("MongoDB leads, users, and sessions are ready.\n");
  } finally {
    await client.close();
  }
}

void main();
