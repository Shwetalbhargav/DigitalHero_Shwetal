import { describe, expect, it } from "vitest";

import { getSafeAdminReturnPath } from "./page";

describe("getSafeAdminReturnPath", () => {
  it.each([
    ["/admin", "/admin"],
    ["/admin?status=new&page=2", "/admin?status=new&page=2"],
    ["/admin/leads/123#details", "/admin/leads/123#details"],
  ])("allows a local admin return path", (input, expected) => {
    expect(getSafeAdminReturnPath(input)).toBe(expected);
  });

  it.each([
    ["https://attacker.test/admin", "/admin"],
    ["//attacker.test/admin", "/admin"],
    ["/administrator", "/admin"],
    ["/", "/admin"],
    [undefined, "/admin"],
    [["/admin"], "/admin"],
  ])("rejects unsafe return target %s", (input, expected) => {
    expect(getSafeAdminReturnPath(input)).toBe(expected);
  });
});
