import { describe, expect, it } from "vitest";

import nextConfig from "./next.config";

describe("security headers", () => {
  it("applies the required browser protections to every route", async () => {
    const configured = await nextConfig.headers?.();
    const headers = new Map(
      configured?.[0]?.headers.map(({ key, value }) => [key, value]),
    );

    expect(configured?.[0]?.source).toBe("/(.*)");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(headers.get("Permissions-Policy")).not.toContain("*");
    expect(headers.get("Strict-Transport-Security")).toContain(
      "max-age=31536000",
    );
  });
});
