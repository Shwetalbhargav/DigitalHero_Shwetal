import { MongoClient } from "mongodb";

import { getE2eEnvironment } from "./test-environment";

export default async function globalTeardown(): Promise<void> {
  const environment = getE2eEnvironment();
  const client = new MongoClient(environment.MONGODB_URI);

  try {
    await client.db(environment.MONGODB_DB_NAME).dropDatabase();
  } finally {
    await client.close();
  }
}
