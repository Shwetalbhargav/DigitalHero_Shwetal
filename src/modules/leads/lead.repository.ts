import { ObjectId, type Collection, type Filter, type WithId } from "mongodb";

import { getDatabase } from "@/infrastructure/database/mongodb";

import type { PersistedLead } from "./lead.mapping";
import type {
  CreateLeadInput,
  LeadBudgetRange,
  LeadDashboardCounts,
  LeadListQuery,
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
  findPage(query: LeadListQuery): Promise<{
    items: PersistedLead[];
    totalItems: number;
    counts: LeadDashboardCounts;
  }>;
  findById(id: string): Promise<PersistedLead | null>;
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

function buildFilter(query: LeadListQuery): Filter<LeadDocument> {
  const filter: Filter<LeadDocument> = {};
  if (query.status) filter.status = query.status;
  const search = query.search?.trim();
  if (search) {
    const pattern = new RegExp(escapeRegularExpression(search), "i");
    filter.$or = [{ name: pattern }, { email: pattern }, { message: pattern }];
  }
  return filter;
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

    async findPage(query) {
      const collection = await getLeadsCollection();
      const filter = buildFilter(query);
      const direction = query.sort === "oldest" ? 1 : -1;
      const [documents, totalItems, groupedCounts] = await Promise.all([
        collection
          .find(filter)
          .sort({ createdAt: direction, _id: direction })
          .skip((query.page - 1) * query.pageSize)
          .limit(query.pageSize)
          .toArray(),
        collection.countDocuments(filter),
        collection
          .aggregate<{ _id: LeadStatus; count: number }>([
            { $group: { _id: "$status", count: { $sum: 1 } } },
          ])
          .toArray(),
      ]);
      const counts: LeadDashboardCounts = {
        total: 0,
        new: 0,
        contacted: 0,
        closed: 0,
      };
      for (const item of groupedCounts) counts[item._id] = item.count;
      counts.total = counts.new + counts.contacted + counts.closed;
      return {
        items: documents.map(mapDocument),
        totalItems,
        counts,
      };
    },

    async findById(id) {
      if (!ObjectId.isValid(id)) return null;
      const collection = await getLeadsCollection();
      const document = await collection.findOne({ _id: new ObjectId(id) });
      return document ? mapDocument(document) : null;
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
