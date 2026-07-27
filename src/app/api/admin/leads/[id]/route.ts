import { NextRequest, NextResponse } from "next/server";

import type {
  AdminLeadError,
  AdminLeadResponse,
} from "@/modules/leads/lead.admin";
import { createLeadService } from "@/modules/leads/lead.service";
import { updateLeadStatusSchema } from "@/modules/leads/lead.validation";

const leadService = createLeadService();

type RouteContext = {
  params: Promise<{ id: string }>;
};

function errorResponse(
  status: number,
  error: AdminLeadError["error"],
): NextResponse<AdminLeadError> {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function GET(
  _request: NextRequest,
  context: RouteContext,
): Promise<NextResponse<AdminLeadResponse>> {
  try {
    const { id } = await context.params;
    const lead = await leadService.get(id);
    if (!lead) {
      return errorResponse(404, {
        code: "NOT_FOUND",
        message: "Lead not found.",
      });
    }
    return NextResponse.json({ ok: true, data: { lead } });
  } catch {
    return errorResponse(500, {
      code: "INTERNAL_ERROR",
      message: "We couldn’t load this lead. Please try again.",
    });
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse<AdminLeadResponse>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, {
      code: "INVALID_REQUEST",
      message: "Send a valid JSON request.",
    });
  }

  const input = updateLeadStatusSchema.safeParse(body);
  if (!input.success) {
    return errorResponse(422, {
      code: "INVALID_REQUEST",
      message: "Status must be new, contacted, or closed.",
    });
  }

  try {
    const { id } = await context.params;
    const lead = await leadService.updateStatus(id, input.data.status);
    if (!lead) {
      return errorResponse(404, {
        code: "NOT_FOUND",
        message: "Lead not found.",
      });
    }
    return NextResponse.json({ ok: true, data: { lead } });
  } catch {
    return errorResponse(500, {
      code: "INTERNAL_ERROR",
      message: "We couldn’t update this lead. Please try again.",
    });
  }
}
