import { randomBytes } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import type { AuthRepository } from "./auth.repository";
import { createAuthService } from "./auth.service";
import type { AuthUser, Session } from "./auth.types";

vi.mock("@/infrastructure/security/audit-log", () => ({
  writeSecurityAuditEvent: vi.fn(),
}));

const user: AuthUser = {
  id: "507f1f77bcf86cd799439011",
  normalizedEmail: "admin@example.com",
  status: "active",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};
const validPassword = randomBytes(18).toString("base64url");

function statefulRepository(): AuthRepository {
  let session: (Session & { token: string }) | null = null;
  const failedAttempts: Date[] = [];

  return {
    provisionAdmin: vi.fn().mockResolvedValue(user),
    authenticate: vi.fn(async (email, password) =>
      email.trim().toLowerCase() === user.normalizedEmail &&
      password === validPassword
        ? user
        : null,
    ),
    findActiveUserById: vi.fn(async (userId) =>
      userId === user.id ? user : null,
    ),
    createSession: vi.fn(async (userId, expiresAt) => {
      session = {
        id: "507f1f77bcf86cd799439012",
        userId,
        token: "runtime-opaque-token",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        expiresAt,
      };
      return session;
    }),
    findActiveSession: vi.fn(async (token, now = new Date()) =>
      session &&
      session.token === token &&
      session.expiresAt.getTime() > now.getTime()
        ? session
        : null,
    ),
    revokeSession: vi.fn(async (token) => {
      if (session?.token === token) session = null;
    }),
    revokeSessionsForUser: vi.fn(async (userId) => {
      if (session?.userId === userId) session = null;
    }),
    countRecentFailedLogins: vi.fn(async (_identifierHash, since) =>
      failedAttempts.filter((attempt) => attempt >= since).length,
    ),
    recordLoginAttempt: vi.fn(async (attempt) => {
      if (attempt.outcome === "invalid_credentials") {
        failedAttempts.push(attempt.createdAt);
      }
    }),
  };
}

describe("authentication lifecycle integration", () => {
  it("persists a login, rejects expiry, and revokes logout", async () => {
    const service = createAuthService(statefulRepository());
    const loginTime = new Date("2026-01-01T00:00:00.000Z");
    const result = await service.login(
      {
        email: "ADMIN@example.com",
        password: validPassword,
        remember: false,
      },
      "203.0.113.10",
      loginTime,
    );

    expect(result.kind).toBe("authenticated");
    if (result.kind !== "authenticated") return;
    await expect(
      service.getCurrentSession(
        result.session.token,
        new Date("2026-01-01T01:00:00.000Z"),
      ),
    ).resolves.toMatchObject({ user });
    await expect(
      service.getCurrentSession(
        result.session.token,
        result.session.expiresAt,
      ),
    ).resolves.toBeNull();

    const replacement = await service.login(
      {
        email: user.normalizedEmail,
        password: validPassword,
        remember: true,
      },
      "203.0.113.10",
      loginTime,
    );
    expect(replacement.kind).toBe("authenticated");
    if (replacement.kind !== "authenticated") return;
    await service.logout(replacement.session.token);
    await expect(
      service.getCurrentSession(replacement.session.token),
    ).resolves.toBeNull();
  });

  it("throttles the sixth repeated credential failure", async () => {
    const service = createAuthService(statefulRepository());
    const now = new Date("2026-01-01T00:00:00.000Z");

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(
        service.login(
          {
            email: user.normalizedEmail,
            password: "wrong password",
            remember: false,
          },
          "203.0.113.10",
          now,
        ),
      ).resolves.toEqual({ kind: "invalid_credentials" });
    }

    await expect(
      service.login(
        {
          email: user.normalizedEmail,
          password: "wrong password",
          remember: false,
        },
        "203.0.113.10",
        now,
      ),
    ).resolves.toEqual({ kind: "rate_limited" });
  });
});
