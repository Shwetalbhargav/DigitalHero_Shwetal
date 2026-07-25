import type { LeadRepository } from "./lead.repository";
import { createMongoLeadRepository } from "./lead.repository";
import { toLead } from "./lead.mapping";
import type { CreateLeadInput, Lead, LeadQuery, LeadStatus } from "./lead.types";
import { createLeadSchema, leadStatusSchema } from "./lead.validation";

export interface LeadService {
  create(input: CreateLeadInput): Promise<Lead>;
  list(query?: LeadQuery): Promise<Lead[]>;
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
      return (await repository.findAll(query)).map(toLead);
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
