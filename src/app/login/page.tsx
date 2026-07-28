import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "./login-form";
import styles from "./login.module.css";

export const metadata: Metadata = {
  title: "Admin sign in | LeadDesk Mini",
  description: "Sign in to the LeadDesk Mini administration area.",
};

interface LoginPageProps {
  searchParams: Promise<{
    next?: string | string[];
    reason?: string | string[];
  }>;
}

export function getSafeAdminReturnPath(value: unknown): string {
  if (typeof value !== "string") return "/admin";
  if (!value.startsWith("/") || value.startsWith("//")) return "/admin";
  try {
    const parsed = new URL(value, "https://leaddesk.invalid");
    const isAdminPath =
      parsed.pathname === "/admin" || parsed.pathname.startsWith("/admin/");
    if (parsed.origin !== "https://leaddesk.invalid" || !isAdminPath) {
      return "/admin";
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/admin";
  }
}

export default async function LoginPage({
  searchParams,
}: LoginPageProps): Promise<React.JSX.Element> {
  const query = await searchParams;
  const returnTo = getSafeAdminReturnPath(query.next);
  const sessionExpired = query.reason === "expired";

  return (
    <main className={styles.page}>
      <div className={styles.atmosphere} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <section className={styles.shell} aria-labelledby="login-title">
        <Link className={styles.brand} href="/" aria-label="LeadDesk Mini home">
          <span className={styles.brandMark} aria-hidden="true">
            L
          </span>
          <span>LeadDesk Mini</span>
        </Link>

        <div className={styles.card}>
          <div className={styles.intro}>
            <span className={styles.lock} aria-hidden="true">
              <svg viewBox="0 0 24 24" role="img">
                <path d="M7 10V8a5 5 0 0 1 10 0v2m-9 0h8a2 2 0 0 1 2 2v7H6v-7a2 2 0 0 1 2-2Z" />
              </svg>
            </span>
            <p>Admin portal</p>
            <h1 id="login-title">Welcome back</h1>
            <p>Sign in to review leads and manage project enquiries.</p>
          </div>

          <LoginForm
            returnTo={returnTo}
            sessionExpired={sessionExpired}
          />
        </div>

        <Link className={styles.returnLink} href="/">
          <span aria-hidden="true">←</span>
          Return to site
        </Link>
      </section>
    </main>
  );
}
