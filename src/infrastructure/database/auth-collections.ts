import type { Db } from "mongodb";

import {
  LOGIN_OUTCOMES,
  USER_STATUSES,
} from "@/modules/auth/auth.types";

export const USERS_COLLECTION_NAME = "users";
export const SESSIONS_COLLECTION_NAME = "sessions";
export const LOGIN_ATTEMPTS_COLLECTION_NAME = "loginAttempts";
export const USERS_NORMALIZED_EMAIL_INDEX = "users_normalizedEmail_unique";
export const SESSIONS_TOKEN_HASH_INDEX = "sessions_tokenHash_unique";
export const SESSIONS_EXPIRES_AT_TTL_INDEX = "sessions_expiresAt_ttl";
export const LOGIN_ATTEMPTS_IDENTIFIER_CREATED_AT_INDEX =
  "loginAttempts_identifierHash_outcome_createdAt";
export const LOGIN_ATTEMPTS_EXPIRES_AT_TTL_INDEX =
  "loginAttempts_expiresAt_ttl";

export const usersCollectionValidator = {
  $jsonSchema: {
    bsonType: "object",
    required: [
      "normalizedEmail",
      "passwordHash",
      "status",
      "createdAt",
      "updatedAt",
    ],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      normalizedEmail: {
        bsonType: "string",
        minLength: 3,
        maxLength: 254,
        pattern: "^[^\\s@A-Z]+@[^\\s@A-Z]+\\.[^\\s@A-Z]+$",
      },
      passwordHash: { bsonType: "string", minLength: 1 },
      status: { enum: [...USER_STATUSES] },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
    },
  },
} as const;

export const sessionsCollectionValidator = {
  $jsonSchema: {
    bsonType: "object",
    required: ["userId", "tokenHash", "expiresAt", "createdAt"],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      userId: { bsonType: "objectId" },
      tokenHash: { bsonType: "string", minLength: 43, maxLength: 43 },
      expiresAt: { bsonType: "date" },
      createdAt: { bsonType: "date" },
    },
  },
} as const;

export const loginAttemptsCollectionValidator = {
  $jsonSchema: {
    bsonType: "object",
    required: ["identifierHash", "outcome", "createdAt", "expiresAt"],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      identifierHash: { bsonType: "string", minLength: 43, maxLength: 43 },
      outcome: { enum: [...LOGIN_OUTCOMES] },
      userId: { bsonType: "objectId" },
      createdAt: { bsonType: "date" },
      expiresAt: { bsonType: "date" },
    },
  },
} as const;

async function ensureCollection(
  database: Db,
  name: string,
  validator: object,
): Promise<void> {
  const existing = await database.listCollections({ name }).next();
  if (!existing) {
    await database.createCollection(name, {
      validator,
      validationLevel: "strict",
      validationAction: "error",
    });
    return;
  }

  if (
    JSON.stringify("options" in existing ? existing.options?.validator : null) !==
    JSON.stringify(validator)
  ) {
    await database.command({
      collMod: name,
      validator,
      validationLevel: "strict",
      validationAction: "error",
    });
  }
}

export async function setupAuthCollections(database: Db): Promise<void> {
  await ensureCollection(
    database,
    USERS_COLLECTION_NAME,
    usersCollectionValidator,
  );
  await ensureCollection(
    database,
    LOGIN_ATTEMPTS_COLLECTION_NAME,
    loginAttemptsCollectionValidator,
  );
  await ensureCollection(
    database,
    SESSIONS_COLLECTION_NAME,
    sessionsCollectionValidator,
  );

  await database.collection(USERS_COLLECTION_NAME).createIndex(
    { normalizedEmail: 1 },
    { name: USERS_NORMALIZED_EMAIL_INDEX, unique: true },
  );
  await database.collection(SESSIONS_COLLECTION_NAME).createIndex(
    { tokenHash: 1 },
    { name: SESSIONS_TOKEN_HASH_INDEX, unique: true },
  );
  await database.collection(SESSIONS_COLLECTION_NAME).createIndex(
    { expiresAt: 1 },
    { name: SESSIONS_EXPIRES_AT_TTL_INDEX, expireAfterSeconds: 0 },
  );
  await database.collection(LOGIN_ATTEMPTS_COLLECTION_NAME).createIndex(
    { identifierHash: 1, outcome: 1, createdAt: -1 },
    { name: LOGIN_ATTEMPTS_IDENTIFIER_CREATED_AT_INDEX },
  );
  await database.collection(LOGIN_ATTEMPTS_COLLECTION_NAME).createIndex(
    { expiresAt: 1 },
    { name: LOGIN_ATTEMPTS_EXPIRES_AT_TTL_INDEX, expireAfterSeconds: 0 },
  );
}
