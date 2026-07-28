import { describe, expect, it, vi } from "vitest";

import {
  SESSIONS_EXPIRES_AT_TTL_INDEX,
  SESSIONS_TOKEN_HASH_INDEX,
  USERS_NORMALIZED_EMAIL_INDEX,
  sessionsCollectionValidator,
  setupAuthCollections,
  usersCollectionValidator,
} from "./auth-collections";

describe("auth collection setup", () => {
  it("creates strict collections and their security indexes", async () => {
    const indexes = new Map<string, ReturnType<typeof vi.fn>>();
    const database = {
      listCollections: vi.fn(() => ({
        next: vi.fn().mockResolvedValue(null),
      })),
      createCollection: vi.fn().mockResolvedValue({}),
      command: vi.fn().mockResolvedValue({ ok: 1 }),
      collection: vi.fn((name: string) => {
        const createIndex =
          indexes.get(name) ?? vi.fn().mockResolvedValue("index");
        indexes.set(name, createIndex);
        return { createIndex };
      }),
    };

    await setupAuthCollections(database as never);

    expect(database.createCollection).toHaveBeenCalledWith("users", {
      validator: usersCollectionValidator,
      validationLevel: "strict",
      validationAction: "error",
    });
    expect(database.createCollection).toHaveBeenCalledWith("sessions", {
      validator: sessionsCollectionValidator,
      validationLevel: "strict",
      validationAction: "error",
    });
    expect(indexes.get("users")).toHaveBeenCalledWith(
      { normalizedEmail: 1 },
      { name: USERS_NORMALIZED_EMAIL_INDEX, unique: true },
    );
    expect(indexes.get("sessions")).toHaveBeenCalledWith(
      { tokenHash: 1 },
      { name: SESSIONS_TOKEN_HASH_INDEX, unique: true },
    );
    expect(indexes.get("sessions")).toHaveBeenCalledWith(
      { expiresAt: 1 },
      { name: SESSIONS_EXPIRES_AT_TTL_INDEX, expireAfterSeconds: 0 },
    );
  });

  it("does not reapply current validators", async () => {
    const existing = new Map<string, object>([
      ["users", { options: { validator: usersCollectionValidator } }],
      ["sessions", { options: { validator: sessionsCollectionValidator } }],
    ]);
    const database = {
      listCollections: vi.fn(({ name }: { name: string }) => ({
        next: vi.fn().mockResolvedValue(existing.get(name)),
      })),
      createCollection: vi.fn(),
      command: vi.fn().mockResolvedValue({ ok: 1 }),
      collection: vi.fn(() => ({
        createIndex: vi.fn().mockResolvedValue("index"),
      })),
    };

    await setupAuthCollections(database as never);

    expect(database.createCollection).not.toHaveBeenCalled();
    expect(database.command).not.toHaveBeenCalled();
  });

  it("reapplies outdated validators", async () => {
    const database = {
      listCollections: vi.fn(() => ({
        next: vi.fn().mockResolvedValue({ options: { validator: {} } }),
      })),
      createCollection: vi.fn(),
      command: vi.fn().mockResolvedValue({ ok: 1 }),
      collection: vi.fn(() => ({
        createIndex: vi.fn().mockResolvedValue("index"),
      })),
    };

    await setupAuthCollections(database as never);

    expect(database.command).toHaveBeenCalledTimes(2);
  });
});
