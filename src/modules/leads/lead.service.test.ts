import { describe, expect, it, vi } from "vitest";

import type { PersistedLead } from "./lead.mapping";
import type { LeadRepository } from "./lead.repository";
import { createLeadService } from "./lead.service";

const input = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  budgetRange: "10k-25k",
  message: "Build a storefront",
} as const;

function repository(overrides: Partial<LeadRepository> = {}): LeadRepository {
  const lead: PersistedLead = {
    id: "507f1f77bcf86cd799439011",
    ...input,
    status: "new",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
  return {
    create: vi.fn().mockResolvedValue(lead),
    findPage: vi.fn().mockResolvedValue({
      items: [lead],
      totalItems: 21,
      counts: { total: 25, new: 10, contacted: 8, closed: 7 },
    }),
    findById: vi.fn().mockResolvedValue(lead),
    updateStatus: vi.fn().mockResolvedValue({ ...lead, status: "contacted" }),
    ...overrides,
  };
}

describe("lead service", () => {
  it("validates, normalizes, and maps a newly created lead", async () => {
    const store = repository();
    const service = createLeadService(store);
    const lead = await service.create({ ...input, email: " ADA@EXAMPLE.COM " });

    expect(store.create).toHaveBeenCalledWith(input);
    expect(lead).toMatchObject({
      status: "new",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("rejects malformed input before persistence", async () => {
    const store = repository();
    const service = createLeadService(store);

    await expect(
      service.create({ ...input, email: "not-an-email" }),
    ).rejects.toThrow();
    expect(store.create).not.toHaveBeenCalled();
  });

  it("maps list projection, pagination, and dashboard counts", async () => {
    const store = repository();
    const service = createLeadService(store);
    const result = await service.list({
      sort: "newest",
      page: 2,
      pageSize: 10,
    });

    expect(store.findPage).toHaveBeenCalledWith({
      sort: "newest",
      page: 2,
      pageSize: 10,
    });
    expect(result).toMatchObject({
      items: [
        {
          id: "507f1f77bcf86cd799439011",
          name: "Ada Lovelace",
          status: "new",
        },
      ],
      pagination: {
        page: 2,
        pageSize: 10,
        totalItems: 21,
        totalPages: 3,
      },
      counts: { total: 25, new: 10, contacted: 8, closed: 7 },
    });
    expect(result.items[0]).not.toHaveProperty("message");
  });
});
