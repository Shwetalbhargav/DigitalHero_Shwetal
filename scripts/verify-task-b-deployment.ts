import { randomBytes } from "node:crypto";

import dotenv from "dotenv";
import { MongoClient } from "mongodb";

import type { AuthSuccess } from "@/modules/auth/auth.api";
import type {
  AdminLeadListResponse,
  AdminLeadResponse,
} from "@/modules/leads/lead.admin";
import type { LeadSubmissionResponse } from "@/modules/leads/lead.api";

import { parseProductionReleaseEnv } from "../src/config/release";

dotenv.config({ path: [".env.local", ".env"], quiet: true });

function requireStatus(
  response: Response,
  expected: number,
  step: string,
): void {
  if (response.status !== expected) {
    throw new Error(`${step} returned HTTP ${response.status}.`);
  }
}

async function readJson<T>(response: Response, step: string): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    throw new Error(`${step} returned a non-JSON response.`);
  }
}

function getSessionCookie(response: Response): string {
  const cookie = response.headers.get("set-cookie")?.split(";", 1)[0];
  if (!cookie?.startsWith("leaddesk_session=")) {
    throw new Error("Login did not issue the expected session cookie.");
  }
  return cookie;
}

async function main(): Promise<void> {
  const environment = parseProductionReleaseEnv(process.env);
  const origin = environment.RELEASE_BASE_URL;
  const runId = randomBytes(6).toString("hex");
  const leadName = `Assessment release ${runId}`;
  const leadEmail = `release-${runId}@example.test`;
  const databaseClient = new MongoClient(environment.MONGODB_URI);
  let sessionCookie: string | undefined;
  let syntheticLeadCreated = false;

  try {
    const health = await fetch(`${origin}/api/health`, { cache: "no-store" });
    requireStatus(health, 200, "Health check");

    const loginPage = await fetch(`${origin}/login`, {
      cache: "no-store",
      redirect: "manual",
    });
    requireStatus(loginPage, 200, "Login page");

    const freshAdmin = await fetch(`${origin}/admin`, {
      cache: "no-store",
      redirect: "manual",
    });
    if (![303, 307, 308].includes(freshAdmin.status)) {
      throw new Error(
        `Fresh admin access returned HTTP ${freshAdmin.status} instead of a redirect.`,
      );
    }
    const location = freshAdmin.headers.get("location") ?? "";
    if (!location.includes("/login") || !location.includes("next=")) {
      throw new Error("Fresh admin access did not preserve a login return URL.");
    }

    const unauthenticatedApi = await fetch(`${origin}/api/admin/leads`, {
      cache: "no-store",
    });
    requireStatus(unauthenticatedApi, 401, "Unauthenticated admin API");

    const submission = await fetch(`${origin}/api/leads`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin,
      },
      body: JSON.stringify({
        name: leadName,
        email: leadEmail,
        budgetRange: "10k-25k",
        message: "Synthetic Task B production release verification.",
      }),
    });
    requireStatus(submission, 201, "Public lead submission");
    const submissionBody = await readJson<LeadSubmissionResponse>(
      submission,
      "Public lead submission",
    );
    if (!submissionBody.ok || submissionBody.data.lead.email !== leadEmail) {
      throw new Error("Public lead submission returned an unexpected payload.");
    }
    syntheticLeadCreated = true;

    const login = await fetch(`${origin}/api/auth/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin,
      },
      body: JSON.stringify({
        email: environment.ADMIN_EMAIL,
        password: environment.ADMIN_PASSWORD,
        remember: false,
      }),
    });
    requireStatus(login, 200, "Assessment admin login");
    const loginBody = await readJson<AuthSuccess>(login, "Assessment admin login");
    if (!loginBody.ok || loginBody.data.user.email !== environment.ADMIN_EMAIL) {
      throw new Error("Assessment admin login returned an unexpected identity.");
    }
    sessionCookie = getSessionCookie(login);

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const adminPage = await fetch(`${origin}/admin`, {
        headers: { cookie: sessionCookie },
        cache: "no-store",
        redirect: "manual",
      });
      requireStatus(adminPage, 200, `Authenticated admin page check ${attempt}`);
    }

    const search = await fetch(
      `${origin}/api/admin/leads?search=${encodeURIComponent(leadEmail)}`,
      {
        headers: { cookie: sessionCookie },
        cache: "no-store",
      },
    );
    requireStatus(search, 200, "Protected lead search");
    const searchBody = await readJson<AdminLeadListResponse>(
      search,
      "Protected lead search",
    );
    if (!searchBody.ok) throw new Error("Protected lead search was rejected.");
    const lead = searchBody.data.items.find(({ email }) => email === leadEmail);
    if (!lead) throw new Error("Synthetic release lead was not searchable.");

    const update = await fetch(`${origin}/api/admin/leads/${lead.id}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie: sessionCookie,
        origin,
      },
      body: JSON.stringify({ status: "closed" }),
    });
    requireStatus(update, 200, "Protected status update");
    const updateBody = await readJson<AdminLeadResponse>(
      update,
      "Protected status update",
    );
    if (!updateBody.ok || updateBody.data.lead.status !== "closed") {
      throw new Error("Protected status update did not persist.");
    }

    const logout = await fetch(`${origin}/api/auth/logout`, {
      method: "POST",
      headers: {
        cookie: sessionCookie,
        origin,
      },
    });
    requireStatus(logout, 204, "Logout");

    const revoked = await fetch(`${origin}/api/admin/leads`, {
      headers: { cookie: sessionCookie },
      cache: "no-store",
    });
    requireStatus(revoked, 401, "Revoked session check");
    sessionCookie = undefined;

    process.stdout.write(
      "Task B production verification passed: public submission, protected access, persistence, and logout.\n",
    );
  } finally {
    if (sessionCookie) {
      await fetch(`${origin}/api/auth/logout`, {
        method: "POST",
        headers: { cookie: sessionCookie, origin },
      }).catch(() => undefined);
    }
    if (syntheticLeadCreated) {
      try {
        await databaseClient
          .db(environment.MONGODB_DB_NAME)
          .collection("leads")
          .deleteMany({ name: leadName, email: leadEmail });
      } finally {
        await databaseClient.close();
      }
    }
  }
}

void main();
