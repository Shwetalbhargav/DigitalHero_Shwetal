// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { replace, refresh } = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
}));

import { LoginForm } from "./login-form";

function response(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function fillCredentials(): void {
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: "admin@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "correct password" },
  });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  replace.mockReset();
  refresh.mockReset();
});

describe("LoginForm", () => {
  it("redirects a valid login to the intended admin URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      response(
        {
          ok: true,
          data: {
            user: { id: "507f1f77bcf86cd799439011", email: "admin@example.com" },
            expiresAt: "2026-02-01T00:00:00.000Z",
          },
        },
        200,
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<LoginForm returnTo="/admin?status=new" sessionExpired={false} />);
    fillCredentials();

    fireEvent.submit(screen.getByRole("button", { name: "Sign in" }).closest("form")!);

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/admin?status=new"),
    );
    expect(refresh).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          email: "admin@example.com",
          password: "correct password",
          remember: false,
        }),
      }),
    );
  });

  it("preserves email, clears password, and shows a generic invalid alert", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        response(
          {
            ok: false,
            error: {
              code: "INVALID_CREDENTIALS",
              message: "Email or password is incorrect.",
              retryable: false,
            },
          },
          401,
        ),
      ),
    );
    render(<LoginForm returnTo="/admin" sessionExpired={false} />);
    fillCredentials();

    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await screen.findByText("We couldn't sign you in");
    expect(screen.getByLabelText("Email address")).toHaveProperty(
      "value",
      "admin@example.com",
    );
    expect(screen.getByLabelText("Password")).toHaveProperty("value", "");
    expect(document.activeElement).toBe(screen.getByLabelText("Password"));
  });

  it("renders a distinguishable expired-session alert", () => {
    render(<LoginForm returnTo="/admin" sessionExpired />);

    expect(screen.getByRole("alert").textContent).toContain(
      "Your session expired",
    );
    expect(screen.queryByText("We couldn't sign you in")).toBeNull();
  });

  it("blocks duplicate submission while showing the loading state", async () => {
    let resolveRequest: ((value: Response) => void) | undefined;
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveRequest = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<LoginForm returnTo="/admin" sessionExpired={false} />);
    fillCredentials();

    const form = screen.getByRole("button", { name: "Sign in" }).closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: "Signing in…" }),
    ).toHaveProperty("disabled", true);
    expect(form.getAttribute("aria-busy")).toBe("true");

    resolveRequest?.(
      response(
        {
          ok: true,
          data: {
            user: { id: "507f1f77bcf86cd799439011", email: "admin@example.com" },
            expiresAt: "2026-02-01T00:00:00.000Z",
          },
        },
        200,
      ),
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin"));
  });

  it("supports password reveal without submitting the form", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<LoginForm returnTo="/admin" sessionExpired={false} />);
    const password = screen.getByLabelText("Password");

    fireEvent.change(password, { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));

    expect(password.getAttribute("type")).toBe("text");
    expect(
      screen
        .getByRole("button", { name: "Hide password" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
