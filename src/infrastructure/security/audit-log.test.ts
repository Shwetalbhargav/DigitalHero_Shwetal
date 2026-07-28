import { afterEach, describe, expect, it, vi } from "vitest";

import { writeSecurityAuditEvent } from "./audit-log";

describe("security audit log", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes only allowlisted, non-secret audit fields", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

    writeSecurityAuditEvent({
      event: "login_succeeded",
      outcome: "success",
      userId: "507f1f77bcf86cd799439011",
    });

    const serialized = String(info.mock.calls[0]?.[0]);
    expect(JSON.parse(serialized)).toMatchObject({
      event: "login_succeeded",
      outcome: "success",
      userId: "507f1f77bcf86cd799439011",
    });
    expect(serialized).not.toMatch(/password|token|hash|private.?key/i);
  });
});
