import type { Lead } from "./lead.types";

export const LEAD_FIELD_NAMES = [
  "name",
  "email",
  "budgetRange",
  "message",
] as const;

export type LeadFieldName = (typeof LEAD_FIELD_NAMES)[number];
export type LeadFieldErrors = Partial<Record<LeadFieldName, string>>;

export interface LeadSubmissionSuccess {
  ok: true;
  data: {
    lead: Lead;
    message: string;
  };
}

export interface LeadSubmissionError {
  ok: false;
  error: {
    code:
      | "INVALID_REQUEST"
      | "VALIDATION_ERROR"
      | "ORIGIN_NOT_ALLOWED"
      | "INTERNAL_ERROR";
    message: string;
    retryable: boolean;
    fieldErrors?: LeadFieldErrors;
  };
}

export type LeadSubmissionResponse =
  | LeadSubmissionSuccess
  | LeadSubmissionError;
