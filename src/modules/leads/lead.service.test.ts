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
    findAll: vi.fn().mockResolvedValue([lead]),
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
});
