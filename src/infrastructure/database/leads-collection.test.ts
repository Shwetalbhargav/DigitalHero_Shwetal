import { describe, expect, it, vi } from "vitest";

import {
  LEADS_EMAIL_INDEX,
  LEADS_STATUS_CREATED_AT_INDEX,
  leadsCollectionValidator,
  setupLeadsCollection,
} from "./leads-collection";

describe("leads collection setup", () => {
  it.each([
    ["missing", null, "createCollection"],
    ["outdated", { options: { validator: {} } }, "command"],
    [
      "current",
      { options: { validator: leadsCollectionValidator } },
      "neither",
    ],
  ] as const)("handles a %s collection", async (_state, existing, action) => {
    const createIndex = vi.fn().mockResolvedValue("index");
    const database = {
      listCollections: vi.fn(() => ({
        next: vi.fn().mockResolvedValue(existing),
      })),
      command: vi.fn().mockResolvedValue({ ok: 1 }),
      createCollection: vi.fn().mockResolvedValue({}),
      collection: vi.fn(() => ({ createIndex })),
    };

    await setupLeadsCollection(database as never);

    expect(database.createCollection).toHaveBeenCalledTimes(
      action === "createCollection" ? 1 : 0,
    );
    expect(database.command).toHaveBeenCalledTimes(action === "command" ? 1 : 0);
    expect(createIndex).toHaveBeenCalledWith(
      { status: 1, createdAt: -1 },
      { name: LEADS_STATUS_CREATED_AT_INDEX },
    );
    expect(createIndex).toHaveBeenCalledWith(
      { email: 1 },
      { name: LEADS_EMAIL_INDEX },
    );
  });

  it("uses strict error-producing document validation", () => {
    expect(leadsCollectionValidator.$jsonSchema.required).toContain("status");
    expect(leadsCollectionValidator.$jsonSchema.additionalProperties).toBe(false);
  });
});
