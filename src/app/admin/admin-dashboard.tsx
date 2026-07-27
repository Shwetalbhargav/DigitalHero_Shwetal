"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  AdminLeadListResponse,
  AdminLeadResponse,
} from "@/modules/leads/lead.admin";
import type {
  Lead,
  LeadBudgetRange,
  LeadListItem,
  LeadListResult,
  LeadStatus,
} from "@/modules/leads/lead.types";

import {
  buildDashboardParams,
  getDashboardView,
  readDashboardQuery,
} from "./dashboard-state";
import styles from "./admin.module.css";

const PAGE_SIZE = 10;
const statusLabels: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  closed: "Closed",
};
const budgetLabels: Record<LeadBudgetRange, string> = {
  "under-5k": "Under $5k",
  "5k-10k": "$5k – $10k",
  "10k-25k": "$10k – $25k",
  "25k-plus": "$25k+",
};

type Toast = { kind: "success" | "error"; message: string };

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function StatusSelect({
  lead,
  disabled,
  onChange,
}: {
  lead: Pick<LeadListItem, "id" | "name" | "status">;
  disabled: boolean;
  onChange: (id: string, status: LeadStatus) => void;
}) {
  return (
    <select
      className={`${styles.statusSelect} ${styles[`status_${lead.status}`]}`}
      aria-label={`Status for ${lead.name}`}
      value={lead.status}
      disabled={disabled}
      onChange={(event) =>
        onChange(lead.id, event.target.value as LeadStatus)
      }
    >
      <option value="new">New</option>
      <option value="contacted">Contacted</option>
      <option value="closed">Closed</option>
    </select>
  );
}

export function DashboardLoading() {
  return (
    <main className={styles.shell} aria-label="Loading lead dashboard">
      <div className={styles.topbar}>
        <div className={styles.brand}>
          <span>L</span> LeadDesk
        </div>
      </div>
      <div className={styles.content}>
        <div className={`${styles.skeleton} ${styles.skeletonTitle}`} />
        <div className={styles.summaryGrid}>
          {[0, 1, 2, 3].map((item) => (
            <div className={`${styles.summaryCard} ${styles.skeleton}`} key={item} />
          ))}
        </div>
        <div className={`${styles.panel} ${styles.skeletonPanel}`} />
      </div>
    </main>
  );
}

export function AdminDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = useMemo(
    () => readDashboardQuery(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );
  const [data, setData] = useState<LeadListResult>();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [listError, setListError] = useState<string>();
  const [selectedLead, setSelectedLead] = useState<Lead>();
  const [selectedId, setSelectedId] = useState<string>();
  const [detailError, setDetailError] = useState<string>();
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string>();
  const [toast, setToast] = useState<Toast>();
  const toastTimer = useRef<number | undefined>(undefined);

  const showToast = useCallback((nextToast: Toast) => {
    window.clearTimeout(toastTimer.current);
    setToast(nextToast);
    toastTimer.current = window.setTimeout(() => setToast(undefined), 4_000);
  }, []);

  useEffect(
    () => () => window.clearTimeout(toastTimer.current),
    [],
  );

  const loadLeads = useCallback(
    async (refresh = false) => {
      if (refresh) setIsRefreshing(true);
      else setIsLoading(true);
      setListError(undefined);
      const params = buildDashboardParams(query, {});
      params.set("pageSize", String(PAGE_SIZE));
      try {
        const response = await fetch(`/api/admin/leads?${params}`);
        const payload = (await response.json()) as AdminLeadListResponse;
        if (!response.ok || !payload.ok) throw new Error("List request failed");
        setData(payload.data);
      } catch {
        setListError("We couldn’t load leads. Check your connection and retry.");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [query],
  );

  useEffect(() => {
    queueMicrotask(() => void loadLeads());
  }, [loadLeads]);

  function setQuery(patch: Partial<typeof query>) {
    const params = buildDashboardParams(query, patch);
    router.replace(params.size ? `/admin?${params}` : "/admin", {
      scroll: false,
    });
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setQuery({ search: String(form.get("search") ?? "").trim(), page: 1 });
  }

  function clearFilters() {
    router.replace("/admin", { scroll: false });
  }

  async function openDetails(id: string) {
    setSelectedId(id);
    setSelectedLead(undefined);
    setDetailError(undefined);
    setIsDetailLoading(true);
    try {
      const response = await fetch(`/api/admin/leads/${id}`);
      const payload = (await response.json()) as AdminLeadResponse;
      if (!response.ok || !payload.ok) throw new Error("Detail request failed");
      setSelectedLead(payload.data.lead);
    } catch {
      setDetailError("We couldn’t load this lead. Please try again.");
    } finally {
      setIsDetailLoading(false);
    }
  }

  function closeDetails() {
    setSelectedId(undefined);
    setSelectedLead(undefined);
    setDetailError(undefined);
  }

  useEffect(() => {
    if (!selectedId) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") closeDetails();
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [selectedId]);

  async function updateStatus(id: string, status: LeadStatus) {
    setUpdatingId(id);
    try {
      const response = await fetch(`/api/admin/leads/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = (await response.json()) as AdminLeadResponse;
      if (!response.ok || !payload.ok) throw new Error("Update failed");
      setSelectedLead((current) =>
        current?.id === id ? payload.data.lead : current,
      );
      await loadLeads(true);
      showToast({
        kind: "success",
        message: `${payload.data.lead.name} marked ${statusLabels[status].toLowerCase()}.`,
      });
    } catch {
      showToast({
        kind: "error",
        message: "Status wasn’t updated. Please try again.",
      });
    } finally {
      setUpdatingId(undefined);
    }
  }

  const view = data
    ? getDashboardView(data.counts.total, data.items.length)
    : undefined;

  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <Link href="/" className={styles.brand} aria-label="LeadDesk home">
          <span aria-hidden="true">L</span>
          LeadDesk
        </Link>
        <div className={styles.adminIdentity}>
          <span aria-hidden="true">A</span>
          <div>
            <strong>Admin workspace</strong>
            <small>Task A · Unprotected</small>
          </div>
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.heading}>
          <div>
            <p className={styles.eyebrow}>Lead management</p>
            <h1>Project enquiries</h1>
            <p>Review new opportunities and keep every conversation moving.</p>
          </div>
          <button
            className={styles.refreshButton}
            type="button"
            onClick={() => void loadLeads(true)}
            disabled={isRefreshing}
          >
            <span aria-hidden="true">↻</span>
            {isRefreshing ? "Refreshing…" : "Refresh leads"}
          </button>
        </div>

        <section className={styles.summaryGrid} aria-label="Lead summary">
          {[
            ["All leads", data?.counts.total, "◎", "total"],
            ["New", data?.counts.new, "✦", "new"],
            ["Contacted", data?.counts.contacted, "↗", "contacted"],
            ["Closed", data?.counts.closed, "✓", "closed"],
          ].map(([label, count, icon, tone]) => (
            <article className={`${styles.summaryCard} ${styles[tone as string]}`} key={label}>
              <span className={styles.summaryIcon} aria-hidden="true">
                {icon}
              </span>
              <div>
                <p>{label}</p>
                <strong>{count ?? "—"}</strong>
              </div>
            </article>
          ))}
        </section>

        <section className={styles.panel} aria-labelledby="lead-list-title">
          <div className={styles.panelHeader}>
            <div>
              <h2 id="lead-list-title">All enquiries</h2>
              <p>
                {data
                  ? `${data.pagination.totalItems} matching ${
                      data.pagination.totalItems === 1 ? "lead" : "leads"
                    }`
                  : "Loading enquiries"}
              </p>
            </div>
            <form className={styles.search} onSubmit={submitSearch} role="search">
              <label className={styles.srOnly} htmlFor="lead-search">
                Search leads
              </label>
              <span aria-hidden="true">⌕</span>
              <input
                id="lead-search"
                name="search"
                key={query.search}
                defaultValue={query.search}
                placeholder="Search name, email or message"
              />
              <button type="submit">Search</button>
            </form>
          </div>

          <div className={styles.filters}>
            <label>
              <span>Status</span>
              <select
                value={query.status}
                onChange={(event) =>
                  setQuery({
                    status: event.target.value as LeadStatus | "",
                    page: 1,
                  })
                }
              >
                <option value="">All statuses</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="closed">Closed</option>
              </select>
            </label>
            <label>
              <span>Sort</span>
              <select
                value={query.sort}
                onChange={(event) =>
                  setQuery({
                    sort: event.target.value as "newest" | "oldest",
                    page: 1,
                  })
                }
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </label>
            {query.search || query.status || query.sort !== "newest" ? (
              <button type="button" onClick={clearFilters}>
                Clear filters
              </button>
            ) : null}
          </div>

          {isLoading ? (
            <div className={styles.loadingRows} role="status">
              <span className={styles.srOnly}>Loading leads</span>
              {[0, 1, 2, 3, 4].map((item) => (
                <div className={styles.skeleton} key={item} />
              ))}
            </div>
          ) : listError ? (
            <StatePanel
              icon="!"
              title="Leads couldn’t be loaded"
              description={listError}
              action="Try again"
              onAction={() => void loadLeads()}
            />
          ) : view === "empty" ? (
            <StatePanel
              icon="✦"
              title="No leads yet"
              description="New project enquiries will appear here as soon as they arrive."
              action="Refresh"
              onAction={() => void loadLeads(true)}
            />
          ) : view === "no-results" ? (
            <StatePanel
              icon="⌕"
              title="No matching leads"
              description="Try a different search or clear the active filters."
              action="Clear filters"
              onAction={clearFilters}
            />
          ) : data ? (
            <>
              <LeadTable
                leads={data.items}
                updatingId={updatingId}
                onDetails={(id) => void openDetails(id)}
                onStatus={(id, status) => void updateStatus(id, status)}
              />
              <LeadCards
                leads={data.items}
                updatingId={updatingId}
                onDetails={(id) => void openDetails(id)}
                onStatus={(id, status) => void updateStatus(id, status)}
              />
              <div className={styles.pagination}>
                <p>
                  Page {data.pagination.page} of{" "}
                  {Math.max(1, data.pagination.totalPages)}
                </p>
                <div>
                  <button
                    type="button"
                    disabled={data.pagination.page <= 1}
                    onClick={() => setQuery({ page: query.page - 1 })}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={
                      data.pagination.page >= data.pagination.totalPages
                    }
                    onClick={() => setQuery({ page: query.page + 1 })}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </section>
      </div>

      {selectedId ? (
        <LeadDrawer
          lead={selectedLead}
          isLoading={isDetailLoading}
          error={detailError}
          updating={updatingId === selectedId}
          onClose={closeDetails}
          onRetry={() => void openDetails(selectedId)}
          onStatus={(status) => void updateStatus(selectedId, status)}
        />
      ) : null}

      {toast ? (
        <div
          className={`${styles.toast} ${styles[`toast_${toast.kind}`]}`}
          role={toast.kind === "error" ? "alert" : "status"}
          aria-live={toast.kind === "error" ? "assertive" : "polite"}
        >
          <span aria-hidden="true">{toast.kind === "success" ? "✓" : "!"}</span>
          {toast.message}
        </div>
      ) : null}
    </main>
  );
}

function StatePanel({
  icon,
  title,
  description,
  action,
  onAction,
}: {
  icon: string;
  title: string;
  description: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className={styles.statePanel}>
      <span aria-hidden="true">{icon}</span>
      <h3>{title}</h3>
      <p>{description}</p>
      <button type="button" onClick={onAction}>
        {action}
      </button>
    </div>
  );
}

type LeadCollectionProps = {
  leads: LeadListItem[];
  updatingId?: string;
  onDetails: (id: string) => void;
  onStatus: (id: string, status: LeadStatus) => void;
};

function LeadTable({
  leads,
  updatingId,
  onDetails,
  onStatus,
}: LeadCollectionProps) {
  return (
    <div className={styles.tableWrap}>
      <table>
        <thead>
          <tr>
            <th>Lead</th>
            <th>Budget</th>
            <th>Received</th>
            <th>Status</th>
            <th>
              <span className={styles.srOnly}>Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id}>
              <td>
                <strong>{lead.name}</strong>
                <a href={`mailto:${lead.email}`}>{lead.email}</a>
              </td>
              <td>{budgetLabels[lead.budgetRange]}</td>
              <td>{formatDate(lead.createdAt)}</td>
              <td>
                <StatusSelect
                  lead={lead}
                  disabled={updatingId === lead.id}
                  onChange={onStatus}
                />
              </td>
              <td>
                <button
                  className={styles.viewButton}
                  type="button"
                  onClick={() => onDetails(lead.id)}
                  aria-label={`View details for ${lead.name}`}
                >
                  View <span aria-hidden="true">→</span>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LeadCards({
  leads,
  updatingId,
  onDetails,
  onStatus,
}: LeadCollectionProps) {
  return (
    <div className={styles.mobileCards}>
      {leads.map((lead) => (
        <article className={styles.leadCard} key={lead.id}>
          <div className={styles.leadCardHeader}>
            <div>
              <strong>{lead.name}</strong>
              <a href={`mailto:${lead.email}`}>{lead.email}</a>
            </div>
            <StatusSelect
              lead={lead}
              disabled={updatingId === lead.id}
              onChange={onStatus}
            />
          </div>
          <dl>
            <div>
              <dt>Budget</dt>
              <dd>{budgetLabels[lead.budgetRange]}</dd>
            </div>
            <div>
              <dt>Received</dt>
              <dd>{formatDate(lead.createdAt)}</dd>
            </div>
          </dl>
          <button type="button" onClick={() => onDetails(lead.id)}>
            View lead details <span aria-hidden="true">→</span>
          </button>
        </article>
      ))}
    </div>
  );
}

function LeadDrawer({
  lead,
  isLoading,
  error,
  updating,
  onClose,
  onRetry,
  onStatus,
}: {
  lead?: Lead;
  isLoading: boolean;
  error?: string;
  updating: boolean;
  onClose: () => void;
  onRetry: () => void;
  onStatus: (status: LeadStatus) => void;
}) {
  return (
    <div className={styles.drawerLayer}>
      <button
        className={styles.backdrop}
        type="button"
        aria-label="Close lead details"
        onClick={onClose}
      />
      <aside
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        <div className={styles.drawerHeader}>
          <div>
            <p>Lead details</p>
            <h2 id="drawer-title">{lead?.name ?? "Loading lead…"}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            autoFocus
          >
            ×
          </button>
        </div>
        {isLoading ? (
          <div className={styles.drawerLoading} role="status">
            <span className={styles.srOnly}>Loading lead details</span>
            {[0, 1, 2, 3].map((item) => (
              <div className={styles.skeleton} key={item} />
            ))}
          </div>
        ) : error ? (
          <StatePanel
            icon="!"
            title="Details unavailable"
            description={error}
            action="Try again"
            onAction={onRetry}
          />
        ) : lead ? (
          <div className={styles.drawerBody}>
            <div className={styles.drawerStatus}>
              <label htmlFor="drawer-status">Lead status</label>
              <select
                id="drawer-status"
                value={lead.status}
                disabled={updating}
                onChange={(event) =>
                  onStatus(event.target.value as LeadStatus)
                }
              >
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <dl className={styles.detailList}>
              <div>
                <dt>Email</dt>
                <dd>
                  <a href={`mailto:${lead.email}`}>{lead.email}</a>
                </dd>
              </div>
              <div>
                <dt>Budget</dt>
                <dd>{budgetLabels[lead.budgetRange]}</dd>
              </div>
              <div>
                <dt>Received</dt>
                <dd>{formatDate(lead.createdAt)}</dd>
              </div>
              <div>
                <dt>Last updated</dt>
                <dd>{formatDate(lead.updatedAt)}</dd>
              </div>
            </dl>
            <div className={styles.message}>
              <h3>Project message</h3>
              <p>{lead.message}</p>
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
