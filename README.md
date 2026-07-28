# LeadDesk Mini

LeadDesk Mini is a Next.js and TypeScript application for capturing project
enquiries and managing them through a protected admin workspace.

Task A provides the public landing page, lead form, lead persistence, search,
filtering, details, and status management. Task B adds database-backed admin
identity, secure sessions, a dedicated login experience, authorization for the
dashboard and admin APIs, abuse protection, audit events, and end-to-end
authentication coverage.

## Live application

| Surface | URL | Verification status |
| --- | --- | --- |
| Public landing page | <https://leaddesk-mini-flame.vercel.app/> | `200`, verified 28 July 2026 |
| Admin login | <https://leaddesk-mini-flame.vercel.app/login> | Awaiting Task B production deployment |
| Admin dashboard | <https://leaddesk-mini-flame.vercel.app/admin> | Awaiting Task B production deployment |
| Health check | <https://leaddesk-mini-flame.vercel.app/api/health> | `200`, verified 28 July 2026 |

The current Vercel deployment still serves Task A: `/login` returns `404`.
Deploy the merged Task B release before using the login/dashboard links for
review or recording the walkthrough. The repository does not claim an
unverified preview URL as production.

## Architecture

```text
Browser
  |
  v
Next.js App Router
  |-- Server components: /admin access gate
  |-- Client components: forms and dashboard interactions
  `-- Route handlers: /api/leads, /api/auth/*, /api/admin/*
          |
          v
Domain services
  |-- auth: credentials, throttling, session lifecycle
  `-- leads: submission, queries, details, status changes
          |
          v
MongoDB repositories
  |-- leads
  |-- users
  |-- sessions
  `-- loginAttempts
```

The code follows these boundaries:

| Location | Responsibility |
| --- | --- |
| `src/app` | Pages, server components, route handlers, and route-local UI |
| `src/components` | Reusable public-page components |
| `src/modules/auth` | Auth contracts, validation, crypto, service, repository, and authorization |
| `src/modules/leads` | Lead contracts, validation, mapping, service, and repository |
| `src/infrastructure` | MongoDB connection, collection setup, and security audit logging |
| `src/config` | Server-only environment validation |
| `src/shared` | Cross-module request security |
| `tests/e2e` | Isolated production-build browser journeys |

Route handlers validate untrusted input before calling services. Services own
business rules, repositories own MongoDB documents, and API/page consumers see
only mapped domain objects.

## Authentication

Authentication establishes the admin identity:

1. `POST /api/auth/login` validates the email/password shape.
2. The normalized email is looked up without revealing whether it exists.
3. The supplied password is verified against a salted scrypt hash.
4. Repeated failures are counted by a one-way email/IP identifier. Five
   failures within 15 minutes produce a generic `429` with `Retry-After`.
5. A successful login revokes earlier sessions and creates a cryptographically
   random opaque session token.
6. Only the token's SHA-256 hash enters MongoDB. The raw token is returned only
   in an `HttpOnly`, `SameSite=Lax` cookie that is `Secure` in production.

Standard sessions last 12 hours. Selecting "Keep me signed in" creates a
30-day server session and matching persistent cookie. Logout deletes the
server-side session and expires the cookie. Expired sessions are rejected
immediately by the query, independent of asynchronous TTL cleanup.

Passwords and raw session tokens are never stored or logged. Authentication
responses use generic language and never disclose whether an email exists.

## Authorization

Authorization decides whether an authenticated identity may access a protected
resource:

- `/admin` verifies the cookie-backed session on the server before rendering.
- Every `/api/admin/*` handler independently verifies the session before
  reading or mutating lead data.
- The user must still exist and have `status: "active"` on every verification.
- Missing, expired, revoked, deleted-user, and disabled-user sessions fail
  closed without exposing lead data.
- Unauthenticated pages redirect to `/login?next=...`; only local `/admin`
  return targets are accepted.
- Expired sessions add `reason=expired`, producing the distinct approved alert.
- Browser back-navigation cannot restore access because protected responses
  use `Cache-Control: no-store` and data requests re-check the database.

All state-changing routes require an exact same-origin `Origin` header.
Security events use fixed event/outcome values and never include credentials,
tokens, hashes, request bodies, or exception details.

## Data model

MongoDB collection validators reject unexpected fields and enforce the stored
shape.

### `leads`

| Field | Stored value |
| --- | --- |
| `name` | Trimmed string, 1-120 characters |
| `email` | Normalized lowercase email, at most 254 characters |
| `budgetRange` | `under-5k`, `5k-10k`, `10k-25k`, or `25k-plus` |
| `message` | Trimmed string, 1-5,000 characters |
| `status` | `new`, `contacted`, or `closed` |
| `createdAt`, `updatedAt` | Server-owned dates |

Indexes: `{ status: 1, createdAt: -1 }` and `{ email: 1 }`.

### `users`

| Field | Stored value |
| --- | --- |
| `normalizedEmail` | Unique normalized admin email |
| `passwordHash` | Versioned salted scrypt hash |
| `status` | `active` or `disabled` |
| `createdAt`, `updatedAt` | Server-owned dates |

Index: unique `{ normalizedEmail: 1 }`.

### `sessions`

| Field | Stored value |
| --- | --- |
| `userId` | Owning user ObjectId |
| `tokenHash` | Unique SHA-256 hash of the opaque cookie token |
| `expiresAt` | Absolute server expiry |
| `createdAt` | Server-owned date |

Indexes: unique `{ tokenHash: 1 }` and zero-delay TTL `{ expiresAt: 1 }`.

### `loginAttempts`

| Field | Stored value |
| --- | --- |
| `identifierHash` | One-way email/IP identifier |
| `outcome` | `success`, `invalid_credentials`, or `rate_limited` |
| `userId` | Present only for successful known users |
| `createdAt`, `expiresAt` | Audit time and 24-hour retention boundary |

Indexes support recent-failure counting and automatic TTL cleanup.

## Local setup from a clean clone

Requirements:

- Node.js 24.x
- npm
- MongoDB Atlas or a local MongoDB deployment

```bash
git clone https://github.com/Shwetalbhargav/DigitalHero_Shwetal.git
cd DigitalHero_Shwetal
npm ci
```

Copy `.env.example` to `.env.local`, then replace every example value:

```dotenv
MONGODB_URI=mongodb+srv://username:password@cluster.example.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=leaddesk-development
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=choose-a-strong-unique-password
```

Initialize the database and provision the admin:

```bash
npm run db:setup
npm run db:seed-admin
npm run dev
```

Open <http://localhost:3000/> and <http://localhost:3000/login>.
`db:setup` and `db:seed-admin` are idempotent. Re-running the seed with the same
normalized email does not create a duplicate.

Environment files are ignored by Git. Never commit real credentials, generated
environment files, local database files, or deployment secrets.

## Production setup

1. Create a dedicated MongoDB database user with access only to the production
   LeadDesk database.
2. Configure `MONGODB_URI` as a sensitive server environment variable and
   `MONGODB_DB_NAME` as a server environment variable in Vercel.
3. Do not create `NEXT_PUBLIC_` variants of database, admin, or session secrets.
4. From a trusted environment using the production database values, run
   `npm run db:setup`.
5. Provision or rotate the admin with `ADMIN_EMAIL` and `ADMIN_PASSWORD` set
   only in that trusted environment: `npm run db:seed-admin`.
6. Deploy the merged `main` branch, then verify `/`, `/login`, `/admin`, and
   `/api/health` in a fresh browser.
7. Run the production smoke flow with synthetic lead data and remove it after
   review.

`ADMIN_PASSWORD` is needed by the provisioning command, not by browser code.
Do not expose it through Vercel client variables, build output, logs, a PR,
README, screenshot, or Loom recording.

## Test credentials

Review credentials must be delivered privately through an approved password
manager, one-time secret link, or direct private message to the named reviewer.
Send the production URL and admin email separately from the password when
possible. Never place the password in GitHub, issue comments, CI output,
screenshots, or the Loom description. Rotate or disable the review identity
after the review window.

The automated E2E suite does not use shared credentials. It generates a random
admin email/password and an in-memory MongoDB instance for each run, then
destroys them.

## Validation

Install Chromium once for browser tests:

```bash
npx playwright install chromium
```

Run the release checks:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run security:audit
npm run test:e2e
npm audit --omit=dev --audit-level=high
```

The browser suite covers a fresh context, login and return URL, refresh
persistence, forced expiry, logout, unauthorized APIs, public lead submission,
admin search/details, and all status transitions.

## Working flow and screenshots

1. Submit a project enquiry from the public form.
2. Open `/admin`; a fresh browser is redirected to `/login`.
3. Sign in with privately delivered review credentials.
4. Search for the submitted email and open its details.
5. Update the lead through `new`, `contacted`, and `closed`.
6. Sign out and confirm `/admin` is protected again.

- [Public form - desktop](docs/task-a/screenshots/public-form-desktop.jpg)
- [Admin dashboard - desktop](docs/task-a/screenshots/admin-dashboard-desktop.jpg)
- [Admin dashboard - mobile](docs/task-a/screenshots/admin-dashboard-mobile.jpg)

Screenshots contain only synthetic data and explain the working flow; they are
not a source of credentials.

## Loom walkthrough

- [Three-minute recording script and publication checklist](docs/task-b/loom-walkthrough.md)
- Recording link: not published because the verified production host has not
  yet received Task B.

The recording must be made only after `/login` returns `200` on the production
host. Add the Loom share URL here in a follow-up documentation commit after
checking that no password, cookie, environment value, or private browser data
is visible.

## AI-use disclosure

OpenAI Codex was used as an implementation assistant to inspect the repository,
draft code and documentation, run tests, automate browser verification, and
review diffs. Architecture and security decisions were checked against the
project requirements, and generated changes were validated with TypeScript,
ESLint, Vitest, a production build, the secret audit, and isolated Playwright
flows. No production password, session token, private key, or unredacted
deployment secret was intentionally provided to the AI or committed.
