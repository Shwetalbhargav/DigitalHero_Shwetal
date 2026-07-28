import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthRepository } from "./auth.repository";
import { createAuthService } from "./auth.service";

const user = {
  id: "507f1f77bcf86cd799439011",
  normalizedEmail: "admin@example.com",
  status: "active" as const,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};
const session = {
  id: "507f1f77bcf86cd799439012",
  userId: user.id,
  token: "opaque-token",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  expiresAt: new Date("2026-01-01T12:00:00.000Z"),
};

function repository(): AuthRepository {
  return {
    provisionAdmin: vi.fn(),
    authenticate: vi.fn().mockResolvedValue(user),
    findActiveUserById: vi.fn().mockResolvedValue(user),
    createSession: vi.fn().mockResolvedValue(session),
    findActiveSession: vi.fn().mockResolvedValue(session),
    revokeSession: vi.fn().mockResolvedValue(undefined),
    countRecentFailedLogins: vi.fn().mockResolvedValue(0),
    recordLoginAttempt: vi.fn().mockResolvedValue(undefined),
  };
}

describe("auth service", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it.each([
    [false, 12 * 60 * 60 * 1_000],
    [true, 30 * 24 * 60 * 60 * 1_000],
  ])(
    "creates a server session with remember=%s",
    async (remember, duration) => {
      const authRepository = repository();
      const now = new Date("2026-01-01T00:00:00.000Z");
      const service = createAuthService(authRepository);

      const result = await service.login(
        {
          email: "ADMIN@example.com",
          password: "correct password",
          remember,
        },
        "203.0.113.5",
        now,
      );

      expect(result).toEqual({ kind: "authenticated", session, user });
      expect(authRepository.createSession).toHaveBeenCalledWith(
        user.id,
        new Date(now.getTime() + duration),
      );
      expect(authRepository.recordLoginAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          outcome: "success",
          userId: user.id,
        }),
      );
    },
  );

  it("returns the same generic invalid result and records a failed attempt", async () => {
    const authRepository = repository();
    vi.mocked(authRepository.authenticate).mockResolvedValue(null);
    const service = createAuthService(authRepository);

    await expect(
      service.login(
        {
          email: "missing@example.com",
          password: "wrong password",
          remember: false,
        },
        "203.0.113.5",
        new Date("2026-01-01T00:00:00.000Z"),
      ),
    ).resolves.toEqual({ kind: "invalid_credentials" });
    expect(authRepository.recordLoginAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "invalid_credentials" }),
    );
    expect(authRepository.createSession).not.toHaveBeenCalled();
  });

  it("rate limits after five recent failures without checking credentials", async () => {
    const authRepository = repository();
    vi.mocked(authRepository.countRecentFailedLogins).mockResolvedValue(5);
    const service = createAuthService(authRepository);

    await expect(
      service.login(
        {
          email: "admin@example.com",
          password: "any password",
          remember: false,
        },
        "203.0.113.5",
        new Date("2026-01-01T00:15:00.000Z"),
      ),
    ).resolves.toEqual({ kind: "rate_limited" });
    expect(authRepository.authenticate).not.toHaveBeenCalled();
    expect(authRepository.recordLoginAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "rate_limited" }),
    );
  });

  it("resolves only active, unexpired sessions and revokes by opaque token", async () => {
    const authRepository = repository();
    const service = createAuthService(authRepository);

    await expect(
      service.getCurrentSession(
        "opaque-token",
        new Date("2026-01-01T01:00:00.000Z"),
      ),
    ).resolves.toEqual({ ...session, user });
    await service.logout("opaque-token");

    expect(authRepository.findActiveSession).toHaveBeenCalledWith(
      "opaque-token",
      new Date("2026-01-01T01:00:00.000Z"),
    );
    expect(authRepository.revokeSession).toHaveBeenCalledWith("opaque-token");
  });

  it("revokes a newly created session if success auditing fails", async () => {
    const authRepository = repository();
    vi.mocked(authRepository.recordLoginAttempt).mockRejectedValue(
      new Error("audit unavailable"),
    );
    const service = createAuthService(authRepository);

    await expect(
      service.login(
        {
          email: "admin@example.com",
          password: "correct password",
          remember: false,
        },
        "203.0.113.5",
      ),
    ).rejects.toThrow("audit unavailable");
    expect(authRepository.revokeSession).toHaveBeenCalledWith(session.token);
  });
});
