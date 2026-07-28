import type { AuthUser } from "./auth.types";

export const AUTH_SESSION_COOKIE = "leaddesk_session";

export interface AuthenticatedUserDto {
  id: string;
  email: string;
}

export interface AuthSuccess {
  ok: true;
  data: {
    user: AuthenticatedUserDto;
    expiresAt: string;
  };
}

export type AuthErrorCode =
  | "INVALID_REQUEST"
  | "INVALID_CREDENTIALS"
  | "RATE_LIMITED"
  | "UNAUTHENTICATED"
  | "SESSION_EXPIRED"
  | "INTERNAL_ERROR";

export interface AuthError {
  ok: false;
  error: {
    code: AuthErrorCode;
    message: string;
    retryable: boolean;
  };
}

export function toAuthenticatedUserDto(user: AuthUser): AuthenticatedUserDto {
  return {
    id: user.id,
    email: user.normalizedEmail,
  };
}
