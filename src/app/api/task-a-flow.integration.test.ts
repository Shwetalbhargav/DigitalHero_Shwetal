import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  CreateLeadInput,
  Lead,
  LeadListQuery,
  LeadStatus,
} from "@/modules/leads/lead.types";

const testStore = vi.hoisted(() => ({ leads: [] as Lead[] }));

vi.mock("@/modules/leads/lead.service", () => ({
  createLeadService: () => ({
    async create(input: CreateLeadInput): Promise<Lead> {
      const timestamp = "2026-07-27T12:00:00.000Z";
      const lead: Lead = {
        id: "507f1f77bcf86cd799439011",
        ...input,
        status: "new",
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      testStore.leads.push(lead);
      return lead;
    },
    async list(query: LeadListQuery) {
      const search = query.search?.toLowerCase();
      const items = testStore.leads.filter((lead) => {
        const matchesSearch =
          !search ||
          [lead.name, lead.email, lead.message].some((value) =>
            value.toLowerCase().includes(search),
          );
        return matchesSearch && (!query.status || lead.status === query.status);
      });
      return {
        items: items.map((lead) => ({
          id: lead.id,
          name: lead.name,
          email: lead.email,
          budgetRange: lead.budgetRange,
          status: lead.status,
          createdAt: lead.createdAt,
        })),
        pagination: {
          page: query.page,
          pageSize: query.pageSize,
          totalItems: items.length,
          totalPages: items.length ? 1 : 0,
        },
        counts: {
          total: testStore.leads.length,
          new: testStore.leads.filter((lead) => lead.status === "new").length,
          contacted: testStore.leads.filter(
            (lead) => lead.status === "contacted",
          ).length,
          closed: testStore.leads.filter((lead) => lead.status === "closed")
            .length,
        },
      };
    },
    async get(id: string) {
      return testStore.leads.find((lead) => lead.id === id) ?? null;
    },
    async updateStatus(id: string, status: LeadStatus) {
      const lead = testStore.leads.find((item) => item.id === id);
      if (!lead) return null;
      lead.status = status;
      lead.updatedAt = "2026-07-27T12:05:00.000Z";
      return lead;
    },
  }),
}));

vi.mock("@/modules/auth/admin-authorization", () => ({
  authorizeAdminRequest: vi.fn().mockResolvedValue({
    authorized: true,
    session: {},
  }),
}));

import { GET as listLeads } from "./admin/leads/route";
import { GET as getLead, PATCH as updateLead } from "./admin/leads/[id]/route";
import { POST as createLead } from "./leads/route";

const submission = {
  name: "Complete Flow Lead",
  email: "complete-flow@example.com",
  budgetRange: "10k-25k",
  message: "Verify the public to admin journey",
} as const;

function submissionRequest(): NextRequest {
  return new NextRequest("https://leaddesk.test/api/leads", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://leaddesk.test",
    },
    body: JSON.stringify(submission),
  });
}

function detailContext() {
  return { params: Promise.resolve({ id: "507f1f77bcf86cd799439011" }) };
}

describe("Task A public-to-admin API flow", () => {
  beforeEach(() => {
    testStore.leads.length = 0;
  });

  it("submits, searches, reads, and persists every supported status", async () => {
    const created = await createLead(submissionRequest());
    expect(created.status).toBe(201);

    const search = await listLeads(
      new NextRequest(
        "https://leaddesk.test/api/admin/leads?search=complete-flow&pageSize=10",
      ),
    );
    const searchPayload = await search.json();
    expect(searchPayload.data.items).toEqual([
      expect.objectContaining({
        email: submission.email,
        status: "new",
      }),
    ]);

    const details = await getLead(
      new NextRequest(
        "https://leaddesk.test/api/admin/leads/507f1f77bcf86cd799439011",
      ),
      detailContext(),
    );
    await expect(details.json()).resolves.toMatchObject({
      data: { lead: { message: submission.message } },
    });

    for (const status of ["contacted", "closed", "new"] as const) {
      const response = await updateLead(
        new NextRequest(
          "https://leaddesk.test/api/admin/leads/507f1f77bcf86cd799439011",
          {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ status }),
          },
        ),
        detailContext(),
      );
      expect(response.status).toBe(200);

      const persisted = await getLead(
        new NextRequest(
          "https://leaddesk.test/api/admin/leads/507f1f77bcf86cd799439011",
        ),
        detailContext(),
      );
      await expect(persisted.json()).resolves.toMatchObject({
        data: { lead: { status } },
      });
    }
  });
});
