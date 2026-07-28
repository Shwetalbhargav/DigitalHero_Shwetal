import dotenv from "dotenv";

dotenv.config({ path: [".env.local", ".env"], quiet: true });

async function main(): Promise<void> {
  const [
    { parseProductionReleaseEnv },
    { getMongoClient, getDatabase },
    authCollections,
    leadCollections,
    { createMongoAuthRepository },
  ] = await Promise.all([
    import("../src/config/release"),
    import("../src/infrastructure/database/mongodb"),
    import("../src/infrastructure/database/auth-collections"),
    import("../src/infrastructure/database/leads-collection"),
    import("../src/modules/auth/auth.repository"),
  ]);
  const environment = parseProductionReleaseEnv(process.env);
  const client = await getMongoClient();

  try {
    const database = await getDatabase();
    await leadCollections.setupLeadsCollection(database);
    await authCollections.setupAuthCollections(database);
    const user = await createMongoAuthRepository().provisionAdmin(
      environment.ADMIN_EMAIL,
      environment.ADMIN_PASSWORD,
    );

    const expectedIndexes = new Map<string, string[]>([
      [
        leadCollections.LEADS_COLLECTION_NAME,
        [
          leadCollections.LEADS_STATUS_CREATED_AT_INDEX,
          leadCollections.LEADS_EMAIL_INDEX,
        ],
      ],
      [
        authCollections.USERS_COLLECTION_NAME,
        [authCollections.USERS_NORMALIZED_EMAIL_INDEX],
      ],
      [
        authCollections.SESSIONS_COLLECTION_NAME,
        [
          authCollections.SESSIONS_TOKEN_HASH_INDEX,
          authCollections.SESSIONS_EXPIRES_AT_TTL_INDEX,
        ],
      ],
      [
        authCollections.LOGIN_ATTEMPTS_COLLECTION_NAME,
        [
          authCollections.LOGIN_ATTEMPTS_IDENTIFIER_CREATED_AT_INDEX,
          authCollections.LOGIN_ATTEMPTS_EXPIRES_AT_TTL_INDEX,
        ],
      ],
    ]);

    for (const [collectionName, requiredIndexes] of expectedIndexes) {
      const actualIndexes = new Set(
        (await database.collection(collectionName).indexes()).map(
          ({ name }) => name,
        ),
      );
      for (const requiredIndex of requiredIndexes) {
        if (!actualIndexes.has(requiredIndex)) {
          throw new Error(
            `Release preparation did not create ${collectionName}.${requiredIndex}.`,
          );
        }
      }
    }

    process.stdout.write(
      `Task B storage and assessment admin are ready for ${user.normalizedEmail}.\n`,
    );
  } finally {
    await client.close();
  }
}

void main();
