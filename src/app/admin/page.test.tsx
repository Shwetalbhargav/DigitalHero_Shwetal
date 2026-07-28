import { beforeEach, describe, expect, it, vi } from "vitest";

const { cookieGet, redirect, verifyAdminSession } = vi.hoisted(() => ({
  cookieGet: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  verifyAdminSession: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ get: cookieGet }),
}));

vi.mock("next/navigation", () => ({ redirect }));

vi.mock("@/modules/auth/admin-authorization", () => ({
  verifyAdminSession,
}));

import AdminPage, {
  AdminAccessFallback,
  buildAdminReturnPath,
} from "./page";

describe("admin page protection", () => {
  beforeEach(() => {
    cookieGet.mockReset();
    redirect.mockClear();
    verifyAdminSession.mockReset();
  });

  it("preserves dashboard search state in the return URL", () => {
    expect(
      buildAdminReturnPath({
        status: "new",
        page: "2",
        tag: ["priority", "new"],
        ignored: undefined,
      }),
    ).toBe("/admin?status=new&page=2&tag=priority&tag=new");
  });

  it("redirects a fresh browser to login with its intended URL", async () => {
    cookieGet.mockReturnValue(undefined);

    await expect(
      AdminPage({
        searchParams: Promise.resolve({ status: "new", page: "2" }),
      }),
    ).rejects.toThrow(
      "REDIRECT:/login?next=%2Fadmin%3Fstatus%3Dnew%26page%3D2",
    );
    expect(verifyAdminSession).not.toHaveBeenCalled();
  });

  it("marks an invalid or disabled-user session as expired", async () => {
    cookieGet.mockReturnValue({ value: "stale-token" });
    verifyAdminSession.mockResolvedValue(null);

    await expect(
      AdminPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow(
      "REDIRECT:/login?next=%2Fadmin&reason=expired",
    );
  });

  it("renders the unauthorized fallback when verification cannot fail safely", async () => {
    cookieGet.mockReturnValue({ value: "opaque-token" });
    verifyAdminSession.mockRejectedValue(new Error("database unavailable"));

    const result = await AdminPage({ searchParams: Promise.resolve({}) });

    expect(result.type).toBe(AdminAccessFallback);
  });
});
