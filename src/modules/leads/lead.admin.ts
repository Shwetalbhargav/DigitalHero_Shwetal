import type { Lead, LeadListResult, LeadStatus } from "./lead.types";

export interface AdminLeadListSuccess {
  ok: true;
  data: LeadListResult;
}

export interface AdminLeadSuccess {
  ok: true;
  data: {
    lead: Lead;
  };
}

export interface AdminLeadError {
  ok: false;
  error: {
    code:
      | "INVALID_REQUEST"
      | "NOT_FOUND"
      | "UNAUTHENTICATED"
      | "INTERNAL_ERROR";
    message: string;
  };
}

export interface UpdateLeadStatusInput {
  status: LeadStatus;
}

export type AdminLeadListResponse = AdminLeadListSuccess | AdminLeadError;
export type AdminLeadResponse = AdminLeadSuccess | AdminLeadError;
