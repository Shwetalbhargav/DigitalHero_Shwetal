import { NextRequest, NextResponse } from "next/server";

import { isSameOrigin } from "@/shared/http/request-security";

import {
  AUTH_SESSION_COOKIE,
  type AuthError,
  type AuthErrorCode,
} from "./auth.api";

export function authErrorResponse(
  status: number,
  code: AuthErrorCode,
  message: string,
  retryable = false,
): NextResponse<AuthError> {
  return NextResponse.json(
    { ok: false, error: { code, message, retryable } },
    { status, headers: { "cache-control": "no-store" } },
  );
}

export { isSameOrigin };

export function getClientIpAddress(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

export function setSessionCookie(
  response: NextResponse,
  token: string,
  expiresAt: Date,
  remembered: boolean,
): void {
  response.cookies.set({
    name: AUTH_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(remembered
      ? { maxAge: Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1_000)) }
      : {}),
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: AUTH_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
