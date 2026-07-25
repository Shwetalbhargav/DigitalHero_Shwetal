import type { Lead, LeadBudgetRange, LeadStatus } from "./lead.types";

export interface PersistedLead {
  id: string;
  name: string;
  email: string;
  budgetRange: LeadBudgetRange;
  message: string;
  status: LeadStatus;
  createdAt: Date;
  updatedAt: Date;
}

export function toLead(persisted: PersistedLead): Lead {
  return {
    ...persisted,
    createdAt: persisted.createdAt.toISOString(),
    updatedAt: persisted.updatedAt.toISOString(),
  };
}
