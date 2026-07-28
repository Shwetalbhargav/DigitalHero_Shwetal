import { hashLoginIdentifier } from "./auth.crypto";
import {
  createMongoAuthRepository,
  type AuthRepository,
} from "./auth.repository";
import type { AuthUser, CreatedSession, CurrentSession } from "./auth.types";
import type { LoginInput } from "./auth.validation";

const STANDARD_SESSION_MS = 12 * 60 * 60 * 1_000;
const REMEMBERED_SESSION_MS = 30 * 24 * 60 * 60 * 1_000;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1_000;
const LOGIN_AUDIT_RETENTION_MS = 24 * 60 * 60 * 1_000;
const MAX_FAILED_LOGINS = 5;

export type LoginResult =
  | { kind: "authenticated"; session: CreatedSession; user: AuthUser }
  | { kind: "invalid_credentials" }
  | { kind: "rate_limited" };

export interface AuthService {
  login(
    input: LoginInput,
    ipAddress: string,
    now?: Date,
  ): Promise<LoginResult>;
  getCurrentSession(token: string, now?: Date): Promise<CurrentSession | null>;
  logout(token: string): Promise<void>;
}

export function createAuthService(
  repository: AuthRepository = createMongoAuthRepository(),
): AuthService {
  return {
    async login(input, ipAddress, now = new Date()) {
      const identifierHash = hashLoginIdentifier(input.email, ipAddress);
      const failures = await repository.countRecentFailedLogins(
        identifierHash,
        new Date(now.getTime() - RATE_LIMIT_WINDOW_MS),
      );
      const auditExpiry = new Date(now.getTime() + LOGIN_AUDIT_RETENTION_MS);

      if (failures >= MAX_FAILED_LOGINS) {
        await repository.recordLoginAttempt({
          identifierHash,
          outcome: "rate_limited",
          createdAt: now,
          expiresAt: auditExpiry,
        });
        return { kind: "rate_limited" };
      }

      const user = await repository.authenticate(input.email, input.password);
      if (!user) {
        await repository.recordLoginAttempt({
          identifierHash,
          outcome: "invalid_credentials",
          createdAt: now,
          expiresAt: auditExpiry,
        });
        return { kind: "invalid_credentials" };
      }

      const duration = input.remember
        ? REMEMBERED_SESSION_MS
        : STANDARD_SESSION_MS;
      const session = await repository.createSession(
        user.id,
        new Date(now.getTime() + duration),
      );
      try {
        await repository.recordLoginAttempt({
          identifierHash,
          outcome: "success",
          userId: user.id,
          createdAt: now,
          expiresAt: auditExpiry,
        });
      } catch (error) {
        await repository.revokeSession(session.token);
        throw error;
      }
      return { kind: "authenticated", session, user };
    },

    async getCurrentSession(token, now = new Date()) {
      const session = await repository.findActiveSession(token, now);
      if (!session) return null;
      const user = await repository.findActiveUserById(session.userId);
      return user ? { ...session, user } : null;
    },

    async logout(token) {
      await repository.revokeSession(token);
    },
  };
}
