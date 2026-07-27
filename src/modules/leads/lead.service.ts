import type { LeadRepository } from "./lead.repository";
import { createMongoLeadRepository } from "./lead.repository";
import { toLead, toLeadListItem } from "./lead.mapping";
import type {
  CreateLeadInput,
  Lead,
  LeadListQuery,
  LeadListResult,
  LeadStatus,
} from "./lead.types";
import {
  createLeadSchema,
  leadListQuerySchema,
  leadStatusSchema,
} from "./lead.validation";

export interface LeadService {
  create(input: CreateLeadInput): Promise<Lead>;
  list(query: LeadListQuery): Promise<LeadListResult>;
  get(id: string): Promise<Lead | null>;
  updateStatus(id: string, status: LeadStatus): Promise<Lead | null>;
}

export function createLeadService(
  repository: LeadRepository = createMongoLeadRepository(),
): LeadService {
  return {
    async create(input) {
      const validated = createLeadSchema.parse(input);
      return toLead(await repository.create(validated));
    },
    async list(query) {
      const validated = leadListQuerySchema.parse(query);
      const result = await repository.findPage(validated);
      return {
        items: result.items.map(toLeadListItem),
        pagination: {
          page: validated.page,
          pageSize: validated.pageSize,
          totalItems: result.totalItems,
          totalPages: Math.ceil(result.totalItems / validated.pageSize),
        },
        counts: result.counts,
      };
    },
    async get(id) {
      const lead = await repository.findById(id);
      return lead ? toLead(lead) : null;
    },
    async updateStatus(id, status) {
      const updated = await repository.updateStatus(
        id,
        leadStatusSchema.parse(status),
      );
      return updated ? toLead(updated) : null;
    },
  };
}
