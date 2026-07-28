import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AUTH_SESSION_COOKIE } from "@/modules/auth/auth.api";
import { verifyAdminSession } from "@/modules/auth/admin-authorization";

import {
  AdminDashboard,
  DashboardLoading,
} from "./admin-dashboard";
import styles from "./admin.module.css";

export const metadata: Metadata = {
  title: "Lead management | LeadDesk",
  description: "Review and manage LeadDesk project enquiries.",
};

export const dynamic = "force-dynamic";

interface AdminPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export function buildAdminReturnPath(
  query: Record<string, string | string[] | undefined>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === "string") params.set(key, value);
    else if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    }
  }
  return params.size ? `/admin?${params}` : "/admin";
}

function loginRedirect(returnTo: string, expired = false): string {
  const params = new URLSearchParams({ next: returnTo });
  if (expired) params.set("reason", "expired");
  return `/login?${params}`;
}

export function AdminAccessFallback(): React.JSX.Element {
  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <Link href="/" className={styles.brand} aria-label="LeadDesk home">
          <span aria-hidden="true">L</span>
          LeadDesk
        </Link>
      </header>
      <section
        className={styles.unauthorized}
        aria-labelledby="admin-access-title"
      >
        <span aria-hidden="true">!</span>
        <p className={styles.eyebrow}>Access restricted</p>
        <h1 id="admin-access-title">Admin access is unavailable</h1>
        <p>
          We couldn&apos;t verify your access safely. Sign in again or return
          to the public site.
        </p>
        <div>
          <Link href="/login?next=%2Fadmin">Sign in again</Link>
          <Link href="/">Return to site</Link>
        </div>
      </section>
    </main>
  );
}

export default async function AdminPage({
  searchParams,
}: AdminPageProps): Promise<React.JSX.Element> {
  const query = await searchParams;
  const returnTo = buildAdminReturnPath(query);
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
  if (!token) redirect(loginRedirect(returnTo));

  let session;
  try {
    session = await verifyAdminSession(token);
  } catch {
    return <AdminAccessFallback />;
  }
  if (!session) redirect(loginRedirect(returnTo, true));

  return (
    <Suspense fallback={<DashboardLoading />}>
      <AdminDashboard userEmail={session.user.normalizedEmail} />
    </Suspense>
  );
}
