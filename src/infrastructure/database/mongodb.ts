import { Db, MongoClient } from "mongodb";

import { getServerEnv } from "@/config/env";

declare global {
  var __leadDeskMongoClientPromise: Promise<MongoClient> | undefined;
}

function connectMongoClient(): Promise<MongoClient> {
  const { MONGODB_URI } = getServerEnv();
  const client = new MongoClient(MONGODB_URI, {
    maxPoolSize: 10,
    minPoolSize: 0,
    maxIdleTimeMS: 30_000,
    serverSelectionTimeoutMS: 5_000,
  });

  return client.connect();
}

export function getMongoClient(): Promise<MongoClient> {
  globalThis.__leadDeskMongoClientPromise ??= connectMongoClient();
  return globalThis.__leadDeskMongoClientPromise;
}

export async function getDatabase(): Promise<Db> {
  const { MONGODB_DB_NAME } = getServerEnv();
  const client = await getMongoClient();
  return client.db(MONGODB_DB_NAME);
}
