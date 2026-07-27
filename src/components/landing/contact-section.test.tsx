// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ContactSection } from "./contact-section";

const validValues = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  budgetRange: "10k-25k",
  message: "Build a new storefront",
};

function fillForm(): void {
  fireEvent.change(screen.getByLabelText("Your name"), {
    target: { value: validValues.name },
  });
  fireEvent.change(screen.getByLabelText("Work email"), {
    target: { value: validValues.email },
  });
  fireEvent.click(screen.getByLabelText("$10k – $25k"));
  fireEvent.change(screen.getByLabelText("Tell us about your project"), {
    target: { value: validValues.message },
  });
}

function response(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("contact form states", () => {
  it("uses shared validation errors and focuses the first invalid field", () => {
    render(<ContactSection />);

    fireEvent.click(
      screen.getByRole("button", { name: "Send project details" }),
    );

    expect(screen.getByText("Enter your name.")).toBeTruthy();
    expect(screen.getByText("Enter a valid email address.")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText("Your name"));
  });

  it("blocks duplicate submissions while the request is pending", async () => {
    let resolveRequest: ((value: Response) => void) | undefined;
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveRequest = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<ContactSection />);
    fillForm();

    const submit = screen.getByRole("button", {
      name: "Send project details",
    });
    fireEvent.click(submit);
    fireEvent.click(submit);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Sending…" })).toHaveProperty(
      "disabled",
      true,
    );

    resolveRequest?.(
      response(
        {
          ok: true,
          data: {
            lead: {},
            message: "Thanks! We’ll be in touch soon.",
          },
        },
        201,
      ),
    );
    await screen.findByText("Thanks for reaching out.");
  });

  it("clears the form after success and announces confirmation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        response(
          {
            ok: true,
            data: {
              lead: {},
              message: "Thanks! We’ll be in touch soon.",
            },
          },
          201,
        ),
      ),
    );
    render(<ContactSection />);
    fillForm();

    fireEvent.click(
      screen.getByRole("button", { name: "Send project details" }),
    );

    await screen.findByText("Thanks for reaching out.");
    expect(screen.getByText("Thanks! We’ll be in touch soon.")).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", { name: "Send another enquiry" }),
    );
    expect(screen.getByLabelText("Your name")).toHaveProperty("value", "");
    expect(screen.getByLabelText("Work email")).toHaveProperty("value", "");
  });

  it("preserves values after failure and permits a retry", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        response(
          {
            ok: false,
            error: {
              code: "INTERNAL_ERROR",
              message: "Safe server error",
              retryable: true,
            },
          },
          500,
        ),
      )
      .mockResolvedValueOnce(
        response(
          {
            ok: true,
            data: {
              lead: {},
              message: "Thanks! We’ll be in touch soon.",
            },
          },
          201,
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(<ContactSection />);
    fillForm();

    fireEvent.click(
      screen.getByRole("button", { name: "Send project details" }),
    );
    await screen.findByText("Something went wrong");

    expect(screen.getByLabelText("Your name")).toHaveProperty(
      "value",
      validValues.name,
    );
    expect(screen.getByLabelText("Tell us about your project")).toHaveProperty(
      "value",
      validValues.message,
    );

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await screen.findByText("Thanks for reaching out.");
  });
});
