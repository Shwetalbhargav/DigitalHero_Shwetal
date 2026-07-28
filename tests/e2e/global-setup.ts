import { MongoClient } from "mongodb";

import { setupAuthCollections } from "@/infrastructure/database/auth-collections";
import { setupLeadsCollection } from "@/infrastructure/database/leads-collection";
import { hashPassword } from "@/modules/auth/auth.crypto";

import { getE2eEnvironment } from "./test-environment";

export default async function globalSetup(): Promise<void> {
  const environment = getE2eEnvironment();
  const client = new MongoClient(environment.MONGODB_URI);

  try {
    const database = client.db(environment.MONGODB_DB_NAME);
    await database.dropDatabase();
    await setupLeadsCollection(database);
    await setupAuthCollections(database);
    const now = new Date();
    await database.collection("users").insertOne({
      normalizedEmail: environment.E2E_ADMIN_EMAIL,
      passwordHash: await hashPassword(environment.E2E_ADMIN_PASSWORD),
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    await client.db(environment.MONGODB_DB_NAME).dropDatabase();
    throw error;
  } finally {
    await client.close();
  }
}
