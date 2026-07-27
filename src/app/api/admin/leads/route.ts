import { NextRequest, NextResponse } from "next/server";

import type {
  AdminLeadError,
  AdminLeadListResponse,
} from "@/modules/leads/lead.admin";
import { createLeadService } from "@/modules/leads/lead.service";
import { leadListQuerySchema } from "@/modules/leads/lead.validation";

const leadService = createLeadService();

function errorResponse(
  status: number,
  error: AdminLeadError["error"],
): NextResponse<AdminLeadError> {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<AdminLeadListResponse>> {
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
    return NextResponse.json({ ok: true, data });
  } catch {
    return errorResponse(500, {
      code: "INTERNAL_ERROR",
      message: "We couldn’t load leads. Please try again.",
    });
  }
}
