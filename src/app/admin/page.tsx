import type { Metadata } from "next";
import { Suspense } from "react";

import { AdminDashboard, DashboardLoading } from "./admin-dashboard";

export const metadata: Metadata = {
  title: "Lead management | LeadDesk",
  description: "Review and manage LeadDesk project enquiries.",
};

export default function AdminPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <AdminDashboard />
    </Suspense>
  );
}
