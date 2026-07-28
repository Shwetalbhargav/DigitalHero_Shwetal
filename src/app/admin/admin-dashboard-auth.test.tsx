// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { router, replace, refresh } = vi.hoisted(() => {
  const replace = vi.fn();
  const refresh = vi.fn();
  return { router: { replace, refresh }, replace, refresh };
});

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(),
}));

import { AdminDashboard } from "./admin-dashboard";

const emptyLeadResponse = {
  ok: true,
  data: {
    items: [],
    pagination: {
      page: 1,
      pageSize: 10,
      totalItems: 0,
      totalPages: 0,
    },
    counts: { total: 0, new: 0, contacted: 0, closed: 0 },
  },
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  replace.mockReset();
  refresh.mockReset();
  window.history.replaceState({}, "", "/admin");
});

describe("admin authenticated user menu", () => {
  it("shows identity and logs out through the server before redirecting", async () => {
    const fetchMock = vi.fn((url: string) =>
      Promise.resolve(
        url === "/api/auth/logout"
          ? new Response(null, { status: 204 })
          : new Response(JSON.stringify(emptyLeadResponse), { status: 200 }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminDashboard userEmail="admin@example.com" />);
    await screen.findByText("No leads yet");

    fireEvent.click(screen.getByText("Admin workspace"));
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/auth/logout", {
        method: "POST",
      }),
    );
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/login?next=%2Fadmin"),
    );
    expect(refresh).toHaveBeenCalled();
  });

  it("redirects an already-open dashboard when an API reports session loss", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: false,
            error: { code: "UNAUTHENTICATED", message: "Sign in." },
          }),
          { status: 401 },
        ),
      ),
    );

    render(<AdminDashboard userEmail="admin@example.com" />);

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(
        "/login?reason=expired&next=%2Fadmin",
      ),
    );
    expect(screen.queryByText("No leads yet")).toBeNull();
  });
});
