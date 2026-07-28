import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { login } = vi.hoisted(() => ({ login: vi.fn() }));

vi.mock("@/modules/auth/auth.service", () => ({
  createAuthService: () => ({ login }),
}));

import { POST } from "./route";

const user = {
  id: "507f1f77bcf86cd799439011",
  normalizedEmail: "admin@example.com",
  status: "active",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};
const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1_000);

function request(body: unknown): NextRequest {
  return new NextRequest("https://leaddesk.test/api/auth/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://leaddesk.test",
      "x-forwarded-for": "203.0.113.5, 10.0.0.1",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    login.mockReset();
    login.mockResolvedValue({
      kind: "authenticated",
      user,
      session: {
        id: "507f1f77bcf86cd799439012",
        userId: user.id,
        token: "raw-opaque-session-token",
        createdAt: new Date(),
        expiresAt,
      },
    });
  });

  it("creates a secure remembered cookie without exposing its token", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const response = await POST(
      request({
        email: "admin@example.com",
        password: "correct password",
        remember: true,
      }),
    );
    const payload = await response.json();
    const cookie = response.headers.get("set-cookie") ?? "";

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      data: {
        user: { id: user.id, email: user.normalizedEmail },
        expiresAt: expiresAt.toISOString(),
      },
    });
    expect(JSON.stringify(payload)).not.toContain("raw-opaque-session-token");
    expect(cookie).toContain("leaddesk_session=raw-opaque-session-token");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=lax");
    expect(cookie).toContain("Max-Age=");
    expect(login).toHaveBeenCalledWith(
      expect.objectContaining({ remember: true }),
      "203.0.113.5",
    );
    vi.unstubAllEnvs();
  });

  it("uses a browser-session cookie when remember is false", async () => {
    const response = await POST(
      request({
        email: "admin@example.com",
        password: "correct password",
        remember: false,
      }),
    );

    expect(response.headers.get("set-cookie")).not.toContain("Max-Age");
  });

  it("returns the same generic 401 for invalid credentials and invalid input", async () => {
    login.mockResolvedValueOnce({ kind: "invalid_credentials" });
    const wrong = await POST(
      request({
        email: "admin@example.com",
        password: "wrong",
        remember: false,
      }),
    );
    const malformed = await POST(
      request({ email: "not-an-email", password: "", remember: false }),
    );

    expect(wrong.status).toBe(401);
    expect(malformed.status).toBe(401);
    await expect(wrong.json()).resolves.toEqual(
      await malformed.clone().json(),
    );
  });

  it("returns a retryable 429 when login is rate limited", async () => {
    login.mockResolvedValueOnce({ kind: "rate_limited" });

    const response = await POST(
      request({
        email: "admin@example.com",
        password: "wrong",
        remember: false,
      }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("900");
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "RATE_LIMITED", retryable: true },
    });
  });

  it("rejects a cross-origin login before checking credentials", async () => {
    const crossOriginRequest = new NextRequest(
      "https://leaddesk.test/api/auth/login",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://attacker.test",
        },
        body: JSON.stringify({
          email: "admin@example.com",
          password: "correct password",
          remember: false,
        }),
      },
    );

    const response = await POST(crossOriginRequest);

    expect(response.status).toBe(403);
    expect(login).not.toHaveBeenCalled();
  });
});
