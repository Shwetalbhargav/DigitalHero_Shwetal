import { NextRequest, NextResponse } from "next/server";

import { writeSecurityAuditEvent } from "@/infrastructure/security/audit-log";
import {
  type LeadSubmissionError,
  type LeadSubmissionSuccess,
} from "@/modules/leads/lead.api";
import { createLeadService } from "@/modules/leads/lead.service";
import {
  createLeadSchema,
  getLeadFieldErrors,
} from "@/modules/leads/lead.validation";
import { isSameOrigin } from "@/shared/http/request-security";

const leadService = createLeadService();

function errorResponse(
  status: number,
  error: LeadSubmissionError["error"],
): NextResponse<LeadSubmissionError> {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<LeadSubmissionSuccess | LeadSubmissionError>> {
  if (!isSameOrigin(request)) {
    writeSecurityAuditEvent({
      event: "cross_origin_rejected",
      outcome: "rejected",
    });
    return errorResponse(403, {
      code: "ORIGIN_NOT_ALLOWED",
      message: "This submission could not be accepted.",
      retryable: false,
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, {
      code: "INVALID_REQUEST",
      message: "Send a valid JSON request.",
      retryable: false,
    });
  }

  const parsed = createLeadSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(422, {
      code: "VALIDATION_ERROR",
      message: "Check the highlighted fields and try again.",
      retryable: false,
      fieldErrors: getLeadFieldErrors(parsed.error),
    });
  }

  try {
    const lead = await leadService.create(parsed.data);
    return NextResponse.json(
      {
        ok: true,
        data: {
          lead,
          message: "Thanks! We’ll be in touch soon.",
        },
      },
      { status: 201 },
    );
  } catch {
    return errorResponse(500, {
      code: "INTERNAL_ERROR",
      message: "We couldn’t submit your enquiry. Please try again.",
      retryable: true,
    });
  }
}
