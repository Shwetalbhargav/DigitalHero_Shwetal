export const LEAD_STATUSES = ["new", "contacted", "closed"] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_BUDGET_RANGES = [
  "under-5k",
  "5k-10k",
  "10k-25k",
  "25k-plus",
] as const;

export type LeadBudgetRange = (typeof LEAD_BUDGET_RANGES)[number];

export interface CreateLeadInput {
  name: string;
  email: string;
  budgetRange: LeadBudgetRange;
  message: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  budgetRange: LeadBudgetRange;
  message: string;
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
}

export interface LeadQuery {
  search?: string;
  status?: LeadStatus;
}
