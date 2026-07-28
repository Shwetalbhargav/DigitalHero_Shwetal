export const SECURITY_AUDIT_EVENTS = [
  "login_succeeded",
  "login_failed",
  "login_throttled",
  "sessions_rotated",
  "session_revoked",
  "admin_access_denied",
  "cross_origin_rejected",
] as const;

export type SecurityAuditEvent = (typeof SECURITY_AUDIT_EVENTS)[number];

export interface SecurityAuditEntry {
  event: SecurityAuditEvent;
  outcome: "success" | "rejected";
  userId?: string;
}

export function writeSecurityAuditEvent(entry: SecurityAuditEntry): void {
  const record = {
    timestamp: new Date().toISOString(),
    event: entry.event,
    outcome: entry.outcome,
    ...(entry.userId ? { userId: entry.userId } : {}),
  };

  console.info(JSON.stringify(record));
}
