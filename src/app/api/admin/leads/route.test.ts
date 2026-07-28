import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { list, authorizeAdminRequest } = vi.hoisted(() => ({
  list: vi.fn(),
  authorizeAdminRequest: vi.fn(),
}));

vi.mock("@/modules/leads/lead.service", () => ({
  createLeadService: () => ({ list }),
}));

vi.mock("@/modules/auth/admin-authorization", () => ({
  authorizeAdminRequest,
}));

import { GET } from "./route";

describe("GET /api/admin/leads", () => {
  beforeEach(() => {
    list.mockReset();
    list.mockResolvedValue({
      items: [],
      pagination: {
        page: 2,
        pageSize: 10,
        totalItems: 0,
        totalPages: 0,
      },
      counts: { total: 0, new: 0, contacted: 0, closed: 0 },
    });
    authorizeAdminRequest.mockReset();
    authorizeAdminRequest.mockResolvedValue({
      authorized: true,
      session: {},
    });
  });

  it("returns 401 without reading lead data when unauthorized", async () => {
    authorizeAdminRequest.mockResolvedValueOnce({
      authorized: false,
      response: Response.json(
        {
          ok: false,
          error: { code: "UNAUTHENTICATED", message: "Sign in." },
        },
        { status: 401 },
      ),
    });

    const response = await GET(
      new NextRequest("https://leaddesk.test/api/admin/leads"),
    );

    expect(response.status).toBe(401);
    expect(list).not.toHaveBeenCalled();
  });

  it("combines search, status, sort, and pagination", async () => {
    const request = new NextRequest(
      "https://leaddesk.test/api/admin/leads?search=launch&status=contacted&sort=oldest&page=2&pageSize=10",
    );

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(list).toHaveBeenCalledWith({
      search: "launch",
      status: "contacted",
      sort: "oldest",
      page: 2,
      pageSize: 10,
    });
  });

  it("returns 422 for invalid list parameters", async () => {
    const request = new NextRequest(
      "https://leaddesk.test/api/admin/leads?status=won&page=0",
    );

    const response = await GET(request);

    expect(response.status).toBe(422);
    expect(list).not.toHaveBeenCalled();
  });

  it("returns a safe error when listing fails", async () => {
    list.mockRejectedValueOnce(new Error("MongoServerError: private detail"));
    const response = await GET(
      new NextRequest("https://leaddesk.test/api/admin/leads"),
    );
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(JSON.stringify(payload)).not.toContain("MongoServerError");
  });
});
