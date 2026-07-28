import { describe, expect, it } from "vitest";

import { parseProductionReleaseEnv } from "./release";

const environment = {
  MONGODB_URI: "mongodb://localhost:27017",
  MONGODB_DB_NAME: "leaddesk-production",
  ADMIN_EMAIL: " Reviewer@Example.COM ",
  ADMIN_PASSWORD: "runtime-only-assessment-password",
  RELEASE_BASE_URL: "https://leaddesk.example/admin?ignored=true",
};

describe("production release environment", () => {
  it("normalizes runtime-only release inputs", () => {
    expect(parseProductionReleaseEnv(environment)).toEqual({
      MONGODB_URI: environment.MONGODB_URI,
      MONGODB_DB_NAME: environment.MONGODB_DB_NAME,
      ADMIN_EMAIL: "reviewer@example.com",
      ADMIN_PASSWORD: environment.ADMIN_PASSWORD,
      RELEASE_BASE_URL: "https://leaddesk.example",
    });
  });

  it("rejects insecure remote verification URLs", () => {
    expect(() =>
      parseProductionReleaseEnv({
        ...environment,
        RELEASE_BASE_URL: "http://leaddesk.example",
      }),
    ).toThrow("must use HTTPS");
  });

  it("rejects credentials embedded in the deployment URL", () => {
    expect(() =>
      parseProductionReleaseEnv({
        ...environment,
        RELEASE_BASE_URL: "https://admin:secret@leaddesk.example",
      }),
    ).toThrow("must not contain credentials");
  });
});
