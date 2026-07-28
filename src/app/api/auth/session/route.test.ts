import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentSession } = vi.hoisted(() => ({
  getCurrentSession: vi.fn(),
}));

vi.mock("@/modules/auth/auth.service", () => ({
  createAuthService: () => ({ getCurrentSession }),
}));

import { GET } from "./route";

function request(token?: string): NextRequest {
  return new NextRequest("https://leaddesk.test/api/auth/session", {
    headers: token ? { cookie: `leaddesk_session=${token}` } : {},
  });
}

describe("GET /api/auth/session", () => {
  beforeEach(() => {
    getCurrentSession.mockReset();
  });

  it("returns the current user without exposing the token", async () => {
    const expiresAt = new Date("2026-02-01T00:00:00.000Z");
    getCurrentSession.mockResolvedValue({
      id: "507f1f77bcf86cd799439012",
      userId: "507f1f77bcf86cd799439011",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      expiresAt,
      user: {
        id: "507f1f77bcf86cd799439011",
        normalizedEmail: "admin@example.com",
        status: "active",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    });

    const response = await GET(request("opaque-token"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.user.email).toBe("admin@example.com");
    expect(JSON.stringify(payload)).not.toContain("opaque-token");
  });

  it("distinguishes a missing cookie from an expired session", async () => {
    getCurrentSession.mockResolvedValue(null);

    const missing = await GET(request());
    const expired = await GET(request("expired-token"));

    expect(missing.status).toBe(401);
    expect(expired.status).toBe(401);
    expect(expired.headers.get("set-cookie")).toContain("Max-Age=0");
    await expect(missing.json()).resolves.toMatchObject({
      error: { code: "UNAUTHENTICATED" },
    });
    await expect(expired.json()).resolves.toMatchObject({
      error: { code: "SESSION_EXPIRED" },
    });
  });
});
