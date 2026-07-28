import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { logout } = vi.hoisted(() => ({ logout: vi.fn() }));

vi.mock("@/modules/auth/auth.service", () => ({
  createAuthService: () => ({ logout }),
}));

import { POST } from "./route";

function request(withCookie = true): NextRequest {
  return new NextRequest("https://leaddesk.test/api/auth/logout", {
    method: "POST",
    headers: {
      origin: "https://leaddesk.test",
      ...(withCookie ? { cookie: "leaddesk_session=opaque-token" } : {}),
    },
  });
}

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    logout.mockReset();
    logout.mockResolvedValue(undefined);
  });

  it("revokes the server session and clears the HttpOnly cookie", async () => {
    const response = await POST(request());
    const cookie = response.headers.get("set-cookie") ?? "";

    expect(response.status).toBe(204);
    expect(logout).toHaveBeenCalledWith("opaque-token");
    expect(cookie).toContain("leaddesk_session=");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Max-Age=0");
  });

  it("is idempotent without a session cookie", async () => {
    const response = await POST(request(false));

    expect(response.status).toBe(204);
    expect(logout).not.toHaveBeenCalled();
  });
});
