import { beforeEach, describe, expect, it, vi } from "vitest";

const { command, getDatabase } = vi.hoisted(() => ({
  command: vi.fn(),
  getDatabase: vi.fn(),
}));

vi.mock("@/infrastructure/database/mongodb", () => ({
  getDatabase,
}));

import { GET } from "./route";

describe("GET /api/health", () => {
  beforeEach(() => {
    command.mockReset();
    getDatabase.mockReset();
    getDatabase.mockResolvedValue({ command });
    command.mockResolvedValue({ ok: 1 });
  });

  it("reports ready after MongoDB responds", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      ok: true,
      status: "ready",
    });
  });

  it("returns a generic unavailable response when MongoDB fails", async () => {
    command.mockRejectedValueOnce(
      new Error("MongoServerError: private cluster detail"),
    );

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload).toEqual({ ok: false, status: "unavailable" });
    expect(JSON.stringify(payload)).not.toContain("MongoServerError");
  });
});
