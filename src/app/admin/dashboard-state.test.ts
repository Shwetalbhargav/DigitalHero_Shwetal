import { describe, expect, it } from "vitest";

import {
  buildDashboardParams,
  getDashboardView,
  readDashboardQuery,
} from "./dashboard-state";

describe("admin dashboard query state", () => {
  it("reads valid URL state and normalizes invalid values", () => {
    expect(
      readDashboardQuery(
        new URLSearchParams(
          "search=launch&status=contacted&sort=oldest&page=3",
        ),
      ),
    ).toEqual({
      search: "launch",
      status: "contacted",
      sort: "oldest",
      page: 3,
    });
    expect(
      readDashboardQuery(
        new URLSearchParams("status=won&sort=random&page=-1"),
      ),
    ).toEqual({ search: "", status: "", sort: "newest", page: 1 });
  });

  it("writes only stable non-default URL values", () => {
    const params = buildDashboardParams(
      { search: "", status: "", sort: "newest", page: 1 },
      { search: "Ada", status: "new", page: 2 },
    );
    expect(params.toString()).toBe("search=Ada&status=new&page=2");
  });

  it("distinguishes empty data from filtered no-results", () => {
    expect(getDashboardView(0, 0)).toBe("empty");
    expect(getDashboardView(12, 0)).toBe("no-results");
    expect(getDashboardView(12, 3)).toBe("populated");
  });
});
