# Authentication data module

This module owns admin identities, password hashing, opaque database-backed
sessions, login auditing, authentication APIs, and shared server-side admin
authorization.

## Users

User emails are trimmed and lowercased before persistence. MongoDB enforces the
normalized format and a unique `{ normalizedEmail: 1 }` index. Passwords are
converted server-side to versioned, salted scrypt hashes and plaintext
passwords are neither persisted nor logged.

## Sessions

Session creation returns a cryptographically random opaque token once to the
server caller. Only its SHA-256 hash is stored in MongoDB. Session lookup hashes
the presented token and includes `expiresAt > now` in the database query, so an
expired session is rejected immediately even before MongoDB's asynchronous TTL
cleanup runs. The `{ expiresAt: 1 }` TTL index automatically removes expired
documents.

## Provisioning

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in an ignored environment file, then run:

```bash
npm run db:seed-admin
```

The seed command ensures the auth collections and indexes exist, creates one
normalized admin identity when absent, leaves an unchanged password hash alone,
and rotates the hash when the environment password changes. Running it again
with the same values does not create or rewrite a user.

## Authentication API

| Route | Behavior |
| --- | --- |
| `POST /api/auth/login` | Validates credentials and issues an opaque session cookie |
| `POST /api/auth/logout` | Revokes the database session and expires the cookie |
| `GET /api/auth/session` | Returns the active user and expiry without returning a token |

The `leaddesk_session` cookie is `HttpOnly`, `SameSite=Lax`, scoped to `/`, and
`Secure` in production. A standard login creates a 12-hour server session and a
browser-session cookie. Selecting remember creates a 30-day server session and
adds the matching cookie `Max-Age`.

Invalid emails and passwords share the same `401` response. Five failed attempts
for a hashed email/IP identifier within 15 minutes trigger a `429`. Login audit
records retain only the one-way identifier hash and outcome, expire after 24
hours, and never contain passwords or session tokens.

Client IP derivation assumes the deployment edge replaces `X-Forwarded-For` or
`X-Real-IP`; direct deployments must configure a trusted reverse proxy before
using those headers for abuse controls.

## Admin authorization

The `/admin` server component verifies the session before rendering lead UI.
Each `/api/admin/*` handler repeats that verification before parsing input or
calling the leads service. A session is valid only while its user still exists
and remains active. Logout revokes the database record, so cached browser
history cannot regain page or API access.
