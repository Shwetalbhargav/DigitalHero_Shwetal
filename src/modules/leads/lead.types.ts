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

export const LEAD_SORTS = ["newest", "oldest"] as const;

export type LeadSort = (typeof LEAD_SORTS)[number];

export interface LeadListQuery {
  search?: string;
  status?: LeadStatus;
  sort: LeadSort;
  page: number;
  pageSize: number;
}

export interface LeadListItem {
  id: string;
  name: string;
  email: string;
  budgetRange: LeadBudgetRange;
  status: LeadStatus;
  createdAt: string;
}

export interface LeadDashboardCounts {
  total: number;
  new: number;
  contacted: number;
  closed: number;
}

export interface LeadListResult {
  items: LeadListItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  counts: LeadDashboardCounts;
}
