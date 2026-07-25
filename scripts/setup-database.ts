import dotenv from "dotenv";

dotenv.config({ path: [".env.local", ".env"], quiet: true });

async function main(): Promise<void> {
  const [{ getMongoClient, getDatabase }, { setupLeadsCollection }] =
    await Promise.all([
      import("../src/infrastructure/database/mongodb"),
      import("../src/infrastructure/database/leads-collection"),
    ]);

  const client = await getMongoClient();

  try {
    const database = await getDatabase();
    await setupLeadsCollection(database);
    process.stdout.write("MongoDB leads collection is ready.\n");
  } finally {
    await client.close();
  }
}

void main();
