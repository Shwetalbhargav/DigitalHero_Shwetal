import { describe, expect, it } from "vitest";

import { loginSchema } from "./auth.validation";

describe("login validation", () => {
  it("normalizes email and defaults remember to false", () => {
    expect(
      loginSchema.parse({
        email: " Admin@Example.COM ",
        password: "admin password",
      }),
    ).toEqual({
      email: "Admin@Example.COM",
      password: "admin password",
      remember: false,
    });
  });

  it("rejects malformed, empty, and over-posted credentials", () => {
    expect(
      loginSchema.safeParse({
        email: "not-an-email",
        password: "",
        remember: false,
        role: "admin",
      }).success,
    ).toBe(false);
  });
});
