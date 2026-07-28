import { NextRequest, NextResponse } from "next/server";

import { AUTH_SESSION_COOKIE, type AuthError } from "@/modules/auth/auth.api";
import {
  authErrorResponse,
  clearSessionCookie,
  isSameOrigin,
} from "@/modules/auth/auth.http";
import { createAuthService } from "@/modules/auth/auth.service";

const authService = createAuthService();

export async function POST(
  request: NextRequest,
): Promise<NextResponse<null | AuthError>> {
  if (!isSameOrigin(request)) {
    return authErrorResponse(
      403,
      "INVALID_REQUEST",
      "This request could not be accepted.",
    );
  }

  const token = request.cookies.get(AUTH_SESSION_COOKIE)?.value;
  try {
    if (token) await authService.logout(token);
    const response = new NextResponse<null>(null, { status: 204 });
    clearSessionCookie(response);
    return response;
  } catch {
    return authErrorResponse(
      500,
      "INTERNAL_ERROR",
      "We couldn't sign you out. Please try again.",
      true,
    );
  }
}
