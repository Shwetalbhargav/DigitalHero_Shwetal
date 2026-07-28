import { NextRequest, NextResponse } from "next/server";

import {
  AUTH_SESSION_COOKIE,
  type AuthError,
  type AuthSuccess,
  toAuthenticatedUserDto,
} from "@/modules/auth/auth.api";
import {
  authErrorResponse,
  clearSessionCookie,
} from "@/modules/auth/auth.http";
import { createAuthService } from "@/modules/auth/auth.service";

const authService = createAuthService();

export async function GET(
  request: NextRequest,
): Promise<NextResponse<AuthSuccess | AuthError>> {
  const token = request.cookies.get(AUTH_SESSION_COOKIE)?.value;
  if (!token) {
    return authErrorResponse(
      401,
      "UNAUTHENTICATED",
      "Sign in to continue.",
    );
  }

  try {
    const current = await authService.getCurrentSession(token);
    if (!current) {
      const response = authErrorResponse(
        401,
        "SESSION_EXPIRED",
        "Your session has expired. Please sign in again.",
      );
      clearSessionCookie(response);
      return response;
    }
    return NextResponse.json(
      {
        ok: true,
        data: {
          user: toAuthenticatedUserDto(current.user),
          expiresAt: current.expiresAt.toISOString(),
        },
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return authErrorResponse(
      500,
      "INTERNAL_ERROR",
      "We couldn't check your session. Please try again.",
      true,
    );
  }
}
