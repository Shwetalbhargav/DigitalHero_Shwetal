import { describe, expect, it } from "vitest";

import { createLeadSchema, getLeadFieldErrors } from "./lead.validation";

describe("lead submission validation", () => {
  it("normalizes accepted browser input", () => {
    expect(
      createLeadSchema.parse({
        name: "  Ada Lovelace  ",
        email: " ADA@EXAMPLE.COM ",
        budgetRange: "10k-25k",
        message: "  Build a storefront  ",
      }),
    ).toEqual({
      name: "Ada Lovelace",
      email: "ada@example.com",
      budgetRange: "10k-25k",
      message: "Build a storefront",
    });
  });

  it("returns UI field keys for every invalid value", () => {
    const result = createLeadSchema.safeParse({
      name: "",
      email: "not-an-email",
      budgetRange: "tampered",
      message: "",
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(getLeadFieldErrors(result.error)).toEqual({
      name: "Enter your name.",
      email: "Enter a valid email address.",
      budgetRange: "Select a valid budget range.",
      message: "Tell us about your project.",
    });
  });

  it("rejects server-owned fields supplied by the browser", () => {
    expect(
      createLeadSchema.safeParse({
        name: "Ada Lovelace",
        email: "ada@example.com",
        budgetRange: "10k-25k",
        message: "Build a storefront",
        status: "closed",
        createdAt: "2000-01-01T00:00:00.000Z",
      }).success,
    ).toBe(false);
  });
});
