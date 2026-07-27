import type {
  Lead,
  LeadBudgetRange,
  LeadListItem,
  LeadStatus,
} from "./lead.types";

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

export function toLeadListItem(persisted: PersistedLead): LeadListItem {
  return {
    id: persisted.id,
    name: persisted.name,
    email: persisted.email,
    budgetRange: persisted.budgetRange,
    status: persisted.status,
    createdAt: persisted.createdAt.toISOString(),
  };
}
