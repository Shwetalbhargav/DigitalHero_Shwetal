import { createHash } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";
import { MongoClient } from "mongodb";

import { getE2eEnvironment } from "./test-environment";

const environment = getE2eEnvironment();

async function login(page: Page, returnTo = "/admin"): Promise<void> {
  await page.goto(`/login?next=${encodeURIComponent(returnTo)}`);
  await page.getByLabel("Email address").fill(environment.E2E_ADMIN_EMAIL);
  await page.locator("#password").fill(environment.E2E_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect
    .poll(() => {
      const url = new URL(page.url());
      return `${url.pathname}${url.search}`;
    })
    .toBe(returnTo);
  await expect(
    page.getByRole("heading", { name: "Project enquiries" }),
  ).toBeVisible();
}

async function expireCurrentSession(
  token: string,
): Promise<void> {
  const client = new MongoClient(environment.MONGODB_URI);
  try {
    const tokenHash = createHash("sha256")
      .update(token, "utf8")
      .digest("base64url");
    await client
      .db(environment.MONGODB_DB_NAME)
      .collection("sessions")
      .updateOne(
        { tokenHash },
        { $set: { expiresAt: new Date(Date.now() - 60_000) } },
      );
  } finally {
    await client.close();
  }
}

test("fresh browser, refresh, expiry, logout, and unauthorized APIs", async ({
  page,
  context,
}) => {
  await page.goto("/admin?status=new");
  await expect(page).toHaveURL(
    /\/login\?next=%2Fadmin%3Fstatus%3Dnew$/,
  );

  const unauthenticated = await context.request.get("/api/admin/leads");
  expect(unauthenticated.status()).toBe(401);
  expect(await unauthenticated.text()).not.toContain("items");

  await login(page, "/admin?status=new");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Project enquiries" }),
  ).toBeVisible();

  const sessionCookie = (await context.cookies()).find(
    ({ name }) => name === "leaddesk_session",
  );
  expect(sessionCookie?.httpOnly).toBe(true);
  await expireCurrentSession(sessionCookie?.value ?? "");
  await page.reload();
  await expect(page).toHaveURL(/\/login\?.*reason=expired/);
  await expect(
    page.getByRole("alert").getByText("Your session expired"),
  ).toBeVisible();

  await login(page);
  await page.getByText("Admin workspace").click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin$/);

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin$/);
  const afterLogout = await context.request.get("/api/admin/leads");
  expect(afterLogout.status()).toBe(401);

  const crossOrigin = await context.request.patch(
    "/api/admin/leads/507f1f77bcf86cd799439011",
    {
      headers: { origin: "https://attacker.test" },
      data: { status: "closed" },
    },
  );
  expect(crossOrigin.status()).toBe(403);
  expect(await crossOrigin.text()).not.toContain("email");
});

test("Task A submission, search, details, and status regression", async ({
  page,
}) => {
  const suffix = Date.now().toString(36);
  const name = `E2E Lead ${suffix}`;
  const email = `lead-${suffix}@example.test`;

  await page.goto("/#contact");
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel("Work email").fill(email);
  await page.locator('input[name="budgetRange"][value="10k-25k"]').check();
  await page
    .getByLabel("Tell us about your project")
    .fill("Regression coverage for the complete Task A workflow.");
  await page.getByRole("button", { name: "Send project details" }).click();
  await expect(
    page.getByRole("heading", { name: "Thanks for reaching out." }),
  ).toBeVisible();

  await login(page);
  await page.getByRole("search").getByRole("textbox").fill(email);
  await page.getByRole("search").getByRole("button", { name: "Search" }).click();
  await expect(page.getByText(email).first()).toBeVisible();

  await page.getByRole("button", { name: `View details for ${name}` }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Regression coverage for the complete Task A workflow.",
  );
  await page.getByRole("button", { name: "Close details" }).click();

  const status = page.getByLabel(`Status for ${name}`).first();
  for (const nextStatus of ["contacted", "closed", "new"]) {
    await status.selectOption(nextStatus);
    await expect(page.getByText(`${name} marked ${nextStatus}.`)).toBeVisible();
    await expect(status).toHaveValue(nextStatus);
  }
});
