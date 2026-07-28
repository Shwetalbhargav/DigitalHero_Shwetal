import { NextRequest, NextResponse } from "next/server";

import type {
  AdminLeadError,
  AdminLeadListResponse,
} from "@/modules/leads/lead.admin";
import { authorizeAdminRequest } from "@/modules/auth/admin-authorization";
import { createLeadService } from "@/modules/leads/lead.service";
import { leadListQuerySchema } from "@/modules/leads/lead.validation";

const leadService = createLeadService();

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
): Promise<NextResponse<AdminLeadListResponse>> {
  const authorization = await authorizeAdminRequest(request);
  if (!authorization.authorized) return authorization.response;

  const query = leadListQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!query.success) {
    return errorResponse(422, {
      code: "INVALID_REQUEST",
      message: "Check the list filters and try again.",
    });
  }

  try {
    const data = await leadService.list(query.data);
    return NextResponse.json(
      { ok: true, data },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return errorResponse(500, {
      code: "INTERNAL_ERROR",
      message: "We couldn’t load leads. Please try again.",
    });
  }
}
