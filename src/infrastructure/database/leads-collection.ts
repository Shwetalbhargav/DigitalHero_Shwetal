import type { Db } from "mongodb";

import { LEAD_BUDGET_RANGES, LEAD_STATUSES } from "@/modules/leads/lead.types";

export const LEADS_COLLECTION_NAME = "leads";
export const LEADS_STATUS_CREATED_AT_INDEX = "leads_status_createdAt";
export const LEADS_EMAIL_INDEX = "leads_email";

export const leadsCollectionValidator = {
  $jsonSchema: {
    bsonType: "object",
    required: [
      "name",
      "email",
      "budgetRange",
      "message",
      "status",
      "createdAt",
      "updatedAt",
    ],
    additionalProperties: false,
    properties: {
      _id: { bsonType: "objectId" },
      name: { bsonType: "string", minLength: 1, maxLength: 120 },
      email: { bsonType: "string", minLength: 3, maxLength: 254 },
      budgetRange: { enum: [...LEAD_BUDGET_RANGES] },
      message: { bsonType: "string", minLength: 1, maxLength: 5_000 },
      status: { enum: [...LEAD_STATUSES] },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
    },
  },
} as const;

export async function setupLeadsCollection(database: Db): Promise<void> {
  const existing = await database
    .listCollections({ name: LEADS_COLLECTION_NAME })
    .next();

  if (!existing) {
    await database.createCollection(LEADS_COLLECTION_NAME, {
      validator: leadsCollectionValidator,
      validationLevel: "strict",
      validationAction: "error",
    });
  } else if (
    JSON.stringify(
      "options" in existing ? existing.options?.validator : null,
    ) !==
    JSON.stringify(leadsCollectionValidator)
  ) {
    await database.command({
      collMod: LEADS_COLLECTION_NAME,
      validator: leadsCollectionValidator,
      validationLevel: "strict",
      validationAction: "error",
    });
  }

  const collection = database.collection(LEADS_COLLECTION_NAME);
  await collection.createIndex(
    { status: 1, createdAt: -1 },
    { name: LEADS_STATUS_CREATED_AT_INDEX },
  );
  await collection.createIndex({ email: 1 }, { name: LEADS_EMAIL_INDEX });
}
