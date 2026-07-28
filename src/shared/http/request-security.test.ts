import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { isSameOrigin } from "./request-security";

describe("isSameOrigin", () => {
  it("accepts an exact origin match", () => {
    const request = new NextRequest("https://leaddesk.test/api/example", {
      headers: { origin: "https://leaddesk.test" },
    });

    expect(isSameOrigin(request)).toBe(true);
  });

  it.each([undefined, "https://attacker.test", "not-a-url"])(
    "rejects missing, cross-origin, or malformed origins",
    (origin) => {
      const request = new NextRequest("https://leaddesk.test/api/example", {
        headers: origin ? { origin } : {},
      });

      expect(isSameOrigin(request)).toBe(false);
    },
  );
});
