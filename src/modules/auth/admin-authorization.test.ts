import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

import type { AuthService } from "./auth.service";
import type { CurrentSession } from "./auth.types";
import { authorizeAdminRequest } from "./admin-authorization";

const currentSession: CurrentSession = {
  id: "507f1f77bcf86cd799439012",
  userId: "507f1f77bcf86cd799439011",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  expiresAt: new Date("2026-02-01T00:00:00.000Z"),
  user: {
    id: "507f1f77bcf86cd799439011",
    normalizedEmail: "admin@example.com",
    status: "active",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  },
};

function service(
  session: CurrentSession | null = currentSession,
): AuthService {
  return {
    login: vi.fn(),
    getCurrentSession: vi.fn().mockResolvedValue(session),
    logout: vi.fn(),
  };
}

function request(token?: string): NextRequest {
  return new NextRequest("https://leaddesk.test/api/admin/leads", {
    headers: token ? { cookie: `leaddesk_session=${token}` } : {},
  });
}

describe("authorizeAdminRequest", () => {
  it("rejects a missing cookie before session verification", async () => {
    const authService = service();
    const result = await authorizeAdminRequest(request(), authService);

    expect(result.authorized).toBe(false);
    if (result.authorized) return;
    expect(result.response.status).toBe(401);
    expect(result.response.headers.get("cache-control")).toBe("no-store");
    expect(authService.getCurrentSession).not.toHaveBeenCalled();
  });

  it("accepts a server-verified active user session", async () => {
    const result = await authorizeAdminRequest(
      request("opaque-token"),
      service(),
    );

    expect(result).toEqual({ authorized: true, session: currentSession });
  });

  it("rejects expired, deleted, or disabled-user sessions and clears the cookie", async () => {
    const result = await authorizeAdminRequest(
      request("stale-token"),
      service(null),
    );

    expect(result.authorized).toBe(false);
    if (result.authorized) return;
    expect(result.response.status).toBe(401);
    expect(result.response.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("fails closed without exposing data when verification is unavailable", async () => {
    const authService = service();
    vi.mocked(authService.getCurrentSession).mockRejectedValue(
      new Error("database unavailable"),
    );

    const result = await authorizeAdminRequest(
      request("opaque-token"),
      authService,
    );

    expect(result.authorized).toBe(false);
    if (result.authorized) return;
    expect(result.response.status).toBe(503);
    expect(JSON.stringify(await result.response.json())).not.toContain(
      "database",
    );
  });
});
