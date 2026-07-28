import { NextRequest, NextResponse } from "next/server";

import type {
  AdminLeadError,
  AdminLeadResponse,
} from "@/modules/leads/lead.admin";
import { authorizeAdminRequest } from "@/modules/auth/admin-authorization";
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
  return NextResponse.json(
    { ok: false, error },
    { status, headers: { "cache-control": "no-store" } },
  );
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse<AdminLeadResponse>> {
  const authorization = await authorizeAdminRequest(request);
  if (!authorization.authorized) return authorization.response;

  try {
    const { id } = await context.params;
    const lead = await leadService.get(id);
    if (!lead) {
      return errorResponse(404, {
        code: "NOT_FOUND",
        message: "Lead not found.",
      });
    }
    return NextResponse.json(
      { ok: true, data: { lead } },
      { headers: { "cache-control": "no-store" } },
    );
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
  const authorization = await authorizeAdminRequest(request);
  if (!authorization.authorized) return authorization.response;

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
    return NextResponse.json(
      { ok: true, data: { lead } },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return errorResponse(500, {
      code: "INTERNAL_ERROR",
      message: "We couldn’t update this lead. Please try again.",
    });
  }
}
