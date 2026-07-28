import { describe, expect, it } from "vitest";

import { parseAdminSeedEnv, parseServerEnv } from "./env";

describe("parseServerEnv", () => {
  it("accepts a valid MongoDB environment", () => {
    expect(
      parseServerEnv({
        MONGODB_URI: "mongodb://localhost:27017",
        MONGODB_DB_NAME: "leaddesk",
      }),
    ).toEqual({
      MONGODB_URI: "mongodb://localhost:27017",
      MONGODB_DB_NAME: "leaddesk",
    });
  });

  it("rejects a non-MongoDB connection string", () => {
    expect(() =>
      parseServerEnv({
        MONGODB_URI: "https://example.com",
        MONGODB_DB_NAME: "leaddesk",
      }),
    ).toThrow("MONGODB_URI must use");
  });

  it("rejects an unsafe database name", () => {
    expect(() =>
      parseServerEnv({
        MONGODB_URI: "mongodb://localhost:27017",
        MONGODB_DB_NAME: "lead/desk",
      }),
    ).toThrow("unsupported characters");
  });
});

describe("parseAdminSeedEnv", () => {
  it("normalizes a valid environment-provided admin identity", () => {
    expect(
      parseAdminSeedEnv({
        ADMIN_EMAIL: " Admin@Example.COM ",
        ADMIN_PASSWORD: "correct horse battery staple",
      }),
    ).toEqual({
      ADMIN_EMAIL: "admin@example.com",
      ADMIN_PASSWORD: "correct horse battery staple",
    });
  });

  it("rejects missing, invalid, or short-lived seed credentials", () => {
    expect(() =>
      parseAdminSeedEnv({
        ADMIN_EMAIL: "not-an-email",
        ADMIN_PASSWORD: "short",
      }),
    ).toThrow();
  });
});
