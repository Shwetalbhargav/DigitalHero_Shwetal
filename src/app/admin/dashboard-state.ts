import type { LeadSort, LeadStatus } from "@/modules/leads/lead.types";

export interface DashboardQuery {
  search: string;
  status: LeadStatus | "";
  sort: LeadSort;
  page: number;
}

export type DashboardView = "empty" | "no-results" | "populated";

export function readDashboardQuery(params: URLSearchParams): DashboardQuery {
  const status = params.get("status");
  const sort = params.get("sort");
  const page = Number(params.get("page"));
  return {
    search: params.get("search")?.trim() ?? "",
    status:
      status === "new" || status === "contacted" || status === "closed"
        ? status
        : "",
    sort: sort === "oldest" ? "oldest" : "newest",
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

export function buildDashboardParams(
  current: DashboardQuery,
  patch: Partial<DashboardQuery>,
): URLSearchParams {
  const next = { ...current, ...patch };
  const params = new URLSearchParams();
  if (next.search) params.set("search", next.search);
  if (next.status) params.set("status", next.status);
  if (next.sort !== "newest") params.set("sort", next.sort);
  if (next.page > 1) params.set("page", String(next.page));
  return params;
}

export function getDashboardView(
  totalCount: number,
  visibleItemCount: number,
): DashboardView {
  if (totalCount === 0) return "empty";
  if (visibleItemCount === 0) return "no-results";
  return "populated";
}
