import { NextRequest, NextResponse } from "next/server";

import { writeSecurityAuditEvent } from "@/infrastructure/security/audit-log";
import {
  type AuthError,
  type AuthSuccess,
  toAuthenticatedUserDto,
} from "@/modules/auth/auth.api";
import {
  authErrorResponse,
  getClientIpAddress,
  isSameOrigin,
  setSessionCookie,
} from "@/modules/auth/auth.http";
import { createAuthService } from "@/modules/auth/auth.service";
import { loginSchema } from "@/modules/auth/auth.validation";

const authService = createAuthService();
const CREDENTIAL_ERROR = "Email or password is incorrect.";

export async function POST(
  request: NextRequest,
): Promise<NextResponse<AuthSuccess | AuthError>> {
  if (!isSameOrigin(request)) {
    writeSecurityAuditEvent({
      event: "cross_origin_rejected",
      outcome: "rejected",
    });
    return authErrorResponse(
      403,
      "INVALID_REQUEST",
      "This request could not be accepted.",
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return authErrorResponse(
      400,
      "INVALID_REQUEST",
      "Send a valid login request.",
    );
  }
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return authErrorResponse(401, "INVALID_CREDENTIALS", CREDENTIAL_ERROR);
  }

  try {
    const result = await authService.login(
      parsed.data,
      getClientIpAddress(request),
    );
    if (result.kind === "rate_limited") {
      const response = authErrorResponse(
        429,
        "RATE_LIMITED",
        "Too many sign-in attempts. Please wait and try again.",
        true,
      );
      response.headers.set("retry-after", "900");
      return response;
    }
    if (result.kind === "invalid_credentials") {
      return authErrorResponse(401, "INVALID_CREDENTIALS", CREDENTIAL_ERROR);
    }

    const response = NextResponse.json<AuthSuccess>({
      ok: true,
      data: {
        user: toAuthenticatedUserDto(result.user),
        expiresAt: result.session.expiresAt.toISOString(),
      },
    });
    response.headers.set("cache-control", "no-store");
    setSessionCookie(
      response,
      result.session.token,
      result.session.expiresAt,
      parsed.data.remember,
    );
    return response;
  } catch {
    return authErrorResponse(
      500,
      "INTERNAL_ERROR",
      "We couldn't sign you in. Please try again.",
      true,
    );
  }
}
