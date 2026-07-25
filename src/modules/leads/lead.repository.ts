import { ObjectId, type Collection, type Filter, type WithId } from "mongodb";

import { getDatabase } from "@/infrastructure/database/mongodb";

import type { PersistedLead } from "./lead.mapping";
import type {
  CreateLeadInput,
  LeadBudgetRange,
  LeadQuery,
  LeadStatus,
} from "./lead.types";

interface LeadDocument {
  name: string;
  email: string;
  budgetRange: LeadBudgetRange;
  message: string;
  status: LeadStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadRepository {
  create(input: CreateLeadInput): Promise<PersistedLead>;
  findAll(query?: LeadQuery): Promise<PersistedLead[]>;
  updateStatus(id: string, status: LeadStatus): Promise<PersistedLead | null>;
}

function mapDocument(document: WithId<LeadDocument>): PersistedLead {
  return {
    id: document._id.toHexString(),
    name: document.name,
    email: document.email,
    budgetRange: document.budgetRange,
    message: document.message,
    status: document.status,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

async function getLeadsCollection(): Promise<Collection<LeadDocument>> {
  const database = await getDatabase();
  return database.collection<LeadDocument>("leads");
}

function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function createMongoLeadRepository(): LeadRepository {
  return {
    async create(input) {
      const collection = await getLeadsCollection();
      const now = new Date();
      const document: LeadDocument = {
        ...input,
        status: "new",
        createdAt: now,
        updatedAt: now,
      };
      const result = await collection.insertOne(document);
      return mapDocument({ ...document, _id: result.insertedId });
    },

    async findAll(query = {}) {
      const filter: Filter<LeadDocument> = {};
      if (query.status) filter.status = query.status;
      const search = query.search?.trim();
      if (search) {
        const pattern = new RegExp(escapeRegularExpression(search), "i");
        filter.$or = [{ name: pattern }, { email: pattern }];
      }
      const collection = await getLeadsCollection();
      const documents = await collection
        .find(filter)
        .sort({ createdAt: -1 })
        .toArray();
      return documents.map(mapDocument);
    },

    async updateStatus(id, status) {
      if (!ObjectId.isValid(id)) return null;
      const collection = await getLeadsCollection();
      const document = await collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: { status, updatedAt: new Date() } },
        { returnDocument: "after" },
      );
      return document ? mapDocument(document) : null;
    },
  };
}
