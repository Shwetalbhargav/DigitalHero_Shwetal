import { describe, expect, it } from "vitest";

import {
  createSessionToken,
  hashPassword,
  hashSessionToken,
  normalizeEmail,
  verifyPassword,
} from "./auth.crypto";

describe("auth crypto", () => {
  it("normalizes email identities", () => {
    expect(normalizeEmail(" Admin@Example.COM ")).toBe("admin@example.com");
  });

  it("stores a salted password hash that verifies without containing plaintext", async () => {
    const password = "correct horse battery staple";
    const firstHash = await hashPassword(password);
    const secondHash = await hashPassword(password);

    expect(firstHash).toMatch(/^scrypt\$/);
    expect(firstHash).not.toContain(password);
    expect(firstHash).not.toBe(secondHash);
    await expect(verifyPassword(password, firstHash)).resolves.toBe(true);
    await expect(verifyPassword("wrong password", firstHash)).resolves.toBe(
      false,
    );
    await expect(verifyPassword(password, "malformed")).resolves.toBe(false);
  });

  it("creates opaque tokens and deterministic one-way storage hashes", () => {
    const token = createSessionToken();
    const tokenHash = hashSessionToken(token);

    expect(token).toHaveLength(43);
    expect(tokenHash).toHaveLength(43);
    expect(tokenHash).not.toBe(token);
    expect(hashSessionToken(token)).toBe(tokenHash);
    expect(createSessionToken()).not.toBe(token);
  });
});
