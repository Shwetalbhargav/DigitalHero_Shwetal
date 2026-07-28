import { NextRequest, NextResponse } from "next/server";

import type { AdminLeadError } from "@/modules/leads/lead.admin";

import { AUTH_SESSION_COOKIE } from "./auth.api";
import { clearSessionCookie } from "./auth.http";
import {
  createAuthService,
  type AuthService,
} from "./auth.service";
import type { CurrentSession } from "./auth.types";

export type AdminAuthorization =
  | { authorized: true; session: CurrentSession }
  | { authorized: false; response: NextResponse<AdminLeadError> };

function adminAuthError(
  status: number,
  code: "UNAUTHENTICATED" | "INTERNAL_ERROR",
  message: string,
): NextResponse<AdminLeadError> {
  return NextResponse.json(
    { ok: false, error: { code, message } },
    { status, headers: { "cache-control": "no-store" } },
  );
}

export async function verifyAdminSession(
  token: string,
  authService: AuthService = createAuthService(),
): Promise<CurrentSession | null> {
  return authService.getCurrentSession(token);
}

export async function authorizeAdminRequest(
  request: NextRequest,
  authService: AuthService = createAuthService(),
): Promise<AdminAuthorization> {
  const token = request.cookies.get(AUTH_SESSION_COOKIE)?.value;
  if (!token) {
    return {
      authorized: false,
      response: adminAuthError(
        401,
        "UNAUTHENTICATED",
        "Sign in to access admin data.",
      ),
    };
  }

  try {
    const session = await verifyAdminSession(token, authService);
    if (!session) {
      const response = adminAuthError(
        401,
        "UNAUTHENTICATED",
        "Your session is no longer active.",
      );
      clearSessionCookie(response);
      return { authorized: false, response };
    }
    return { authorized: true, session };
  } catch {
    return {
      authorized: false,
      response: adminAuthError(
        503,
        "INTERNAL_ERROR",
        "Admin access is temporarily unavailable.",
      ),
    };
  }
}
