import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { database } = vi.hoisted(() => ({
  database: {
    collection: vi.fn(),
  },
}));

vi.mock("@/infrastructure/database/mongodb", () => ({
  getDatabase: vi.fn().mockResolvedValue(database),
}));

import { hashPassword, hashSessionToken } from "./auth.crypto";
import { createMongoAuthRepository } from "./auth.repository";

describe("Mongo auth repository", () => {
  beforeEach(() => {
    database.collection.mockReset();
  });

  it("seeds the same normalized admin twice without duplicates or password rewrites", async () => {
    const password = "correct horse battery staple";
    const existing = {
      _id: new ObjectId(),
      normalizedEmail: "admin@example.com",
      passwordHash: await hashPassword(password),
      status: "active",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };
    const collection = {
      findOne: vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existing),
      insertOne: vi.fn().mockResolvedValue({ insertedId: existing._id }),
      findOneAndUpdate: vi.fn(),
    };
    database.collection.mockReturnValue(collection);
    const repository = createMongoAuthRepository();

    await repository.provisionAdmin(" Admin@Example.COM ", password);
    await repository.provisionAdmin("admin@example.com", password);

    expect(collection.insertOne).toHaveBeenCalledTimes(1);
    expect(collection.insertOne.mock.calls[0][0].passwordHash).not.toBe(
      password,
    );
    expect(collection.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("stores only a token hash and rejects an expired session immediately", async () => {
    const insertedId = new ObjectId();
    const userId = new ObjectId();
    const insertOne = vi.fn().mockResolvedValue({ insertedId });
    const findOne = vi.fn().mockResolvedValue(null);
    database.collection.mockReturnValue({ insertOne, findOne });
    const repository = createMongoAuthRepository();
    const expiresAt = new Date("2026-01-01T01:00:00.000Z");

    const created = await repository.createSession(
      userId.toHexString(),
      expiresAt,
    );
    const stored = insertOne.mock.calls[0][0];

    expect(stored).not.toHaveProperty("token");
    expect(stored.tokenHash).toBe(hashSessionToken(created.token));
    expect(stored.tokenHash).not.toBe(created.token);

    await expect(
      repository.findActiveSession(
        created.token,
        new Date("2026-01-01T01:00:00.000Z"),
      ),
    ).resolves.toBeNull();
    expect(findOne).toHaveBeenCalledWith({
      tokenHash: hashSessionToken(created.token),
      expiresAt: { $gt: new Date("2026-01-01T01:00:00.000Z") },
    });
  });

  it("revokes a session using only the opaque token hash", async () => {
    const deleteOne = vi.fn().mockResolvedValue({ deletedCount: 1 });
    database.collection.mockReturnValue({ deleteOne });
    const repository = createMongoAuthRepository();

    await repository.revokeSession("raw-session-token");

    expect(deleteOne).toHaveBeenCalledWith({
      tokenHash: hashSessionToken("raw-session-token"),
    });
    expect(JSON.stringify(deleteOne.mock.calls)).not.toContain(
      "raw-session-token",
    );
  });
});
