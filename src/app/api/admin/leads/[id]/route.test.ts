import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceMocks = vi.hoisted(() => ({
  get: vi.fn(),
  updateStatus: vi.fn(),
  authorizeAdminRequest: vi.fn(),
}));

vi.mock("@/modules/leads/lead.service", () => ({
  createLeadService: () => serviceMocks,
}));

vi.mock("@/modules/auth/admin-authorization", () => ({
  authorizeAdminRequest: serviceMocks.authorizeAdminRequest,
}));

import { GET, PATCH } from "./route";

const lead = {
  id: "507f1f77bcf86cd799439011",
  name: "Ada Lovelace",
  email: "ada@example.com",
  budgetRange: "10k-25k",
  message: "Build a storefront",
  status: "new",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function context(id = lead.id) {
  return { params: Promise.resolve({ id }) };
}

describe("/api/admin/leads/:id", () => {
  beforeEach(() => {
    serviceMocks.get.mockReset();
    serviceMocks.updateStatus.mockReset();
    serviceMocks.get.mockResolvedValue(lead);
    serviceMocks.updateStatus.mockImplementation(
      async (_id: string, status: string) => ({ ...lead, status }),
    );
    serviceMocks.authorizeAdminRequest.mockReset();
    serviceMocks.authorizeAdminRequest.mockResolvedValue({
      authorized: true,
      session: {},
    });
  });

  it.each(["GET", "PATCH"])(
    "returns 401 before reading data for unauthorized %s",
    async (method) => {
      serviceMocks.authorizeAdminRequest.mockResolvedValueOnce({
        authorized: false,
        response: Response.json(
          {
            ok: false,
            error: { code: "UNAUTHENTICATED", message: "Sign in." },
          },
          { status: 401 },
        ),
      });
      const request = new NextRequest(
        `https://leaddesk.test/api/admin/leads/${lead.id}`,
        {
          method,
          ...(method === "PATCH"
            ? {
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ status: "closed" }),
              }
            : {}),
        },
      );

      const response =
        method === "GET"
          ? await GET(request, context())
          : await PATCH(request, context());

      expect(response.status).toBe(401);
      expect(serviceMocks.get).not.toHaveBeenCalled();
      expect(serviceMocks.updateStatus).not.toHaveBeenCalled();
    },
  );

  it("returns lead details", async () => {
    const response = await GET(
      new NextRequest(`https://leaddesk.test/api/admin/leads/${lead.id}`),
      context(),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      data: { lead: { message: "Build a storefront" } },
    });
  });

  it("returns 404 for invalid or missing IDs", async () => {
    serviceMocks.get.mockResolvedValueOnce(null);
    const response = await GET(
      new NextRequest("https://leaddesk.test/api/admin/leads/not-an-id"),
      context("not-an-id"),
    );

    expect(response.status).toBe(404);
  });

  it.each(["new", "contacted", "closed"])(
    "persists the %s status",
    async (status) => {
      const response = await PATCH(
        new NextRequest(
          `https://leaddesk.test/api/admin/leads/${lead.id}`,
          {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ status }),
          },
        ),
        context(),
      );

      expect(response.status).toBe(200);
      expect(serviceMocks.updateStatus).toHaveBeenCalledWith(lead.id, status);
    },
  );

  it("rejects an unsupported status", async () => {
    const response = await PATCH(
      new NextRequest(`https://leaddesk.test/api/admin/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "won" }),
      }),
      context(),
    );

    expect(response.status).toBe(422);
    expect(serviceMocks.updateStatus).not.toHaveBeenCalled();
  });
});
