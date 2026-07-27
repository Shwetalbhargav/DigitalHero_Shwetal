import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { create } = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock("@/modules/leads/lead.service", () => ({
  createLeadService: () => ({ create }),
}));

import { POST } from "./route";

const validInput = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  budgetRange: "10k-25k",
  message: "Build a storefront",
};

function request(body: unknown, origin = "https://leaddesk.test"): NextRequest {
  return new NextRequest("https://leaddesk.test/api/leads", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/leads", () => {
  beforeEach(() => {
    create.mockReset();
    create.mockResolvedValue({
      id: "507f1f77bcf86cd799439011",
      ...validInput,
      status: "new",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("creates a valid lead and returns 201", async () => {
    const response = await POST(request(validInput));

    expect(response.status).toBe(201);
    expect(create).toHaveBeenCalledWith(validInput);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      data: { lead: { status: "new" } },
    });
  });

  it.each([
    ["name", { ...validInput, name: "" }],
    ["email", { ...validInput, email: "invalid" }],
    ["budgetRange", { ...validInput, budgetRange: "tampered" }],
    ["message", { ...validInput, message: "" }],
  ])("returns a field error for invalid %s", async (field, body) => {
    const response = await POST(request(body));
    const payload = await response.json();

    expect(response.status).toBe(422);
    expect(payload.error.fieldErrors[field]).toEqual(expect.any(String));
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects status and timestamps supplied by the browser", async () => {
    const response = await POST(
      request({
        ...validInput,
        status: "closed",
        createdAt: "2000-01-01T00:00:00.000Z",
        updatedAt: "2000-01-01T00:00:00.000Z",
      }),
    );

    expect(response.status).toBe(422);
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects cross-origin submissions", async () => {
    const response = await POST(request(validInput, "https://attacker.test"));

    expect(response.status).toBe(403);
    expect(create).not.toHaveBeenCalled();
  });

  it("does not expose service failures", async () => {
    create.mockRejectedValueOnce(
      new Error("MongoServerError: credentials and cluster details"),
    );

    const response = await POST(request(validInput));
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toEqual({
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "We couldn’t submit your enquiry. Please try again.",
        retryable: true,
      },
    });
    expect(JSON.stringify(payload)).not.toContain("MongoServerError");
  });
});
