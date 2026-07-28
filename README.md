# LeadDesk Mini — Task A

LeadDesk Mini is a Next.js and TypeScript application for capturing project
enquiries and managing their progress in a lightweight admin dashboard.

Task A's public lead workflow and dashboard remain unchanged. The first Task B
branch adds persisted admin identities and sessions, but deliberately does not
yet add login endpoints, cookies, UI, or route protection. Until those later
branches land, `/admin` and its APIs remain directly accessible.

## Requirements

- Node.js 20.9 or newer
- npm
- MongoDB Atlas or a local MongoDB instance

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and replace its placeholder values with
   an Atlas deployment user and cluster:

   ```dotenv
   MONGODB_URI=mongodb+srv://username:password@cluster.example.mongodb.net/?retryWrites=true&w=majority
   MONGODB_DB_NAME=leaddesk-production
   ADMIN_EMAIL=admin@example.com
   ADMIN_PASSWORD=choose-a-strong-unique-password
   ```

3. Create or update the validated collection and indexes:

   ```bash
   npm run db:setup
   ```

   The command is idempotent. It creates or validates the `leads`, `users`, and
   `sessions` collections and ensures their required indexes exist.

4. Provision the environment-driven admin identity:

   ```bash
   npm run db:seed-admin
   ```

   Re-running this command with the same normalized email does not create a
   duplicate. Passwords are stored only as salted scrypt hashes.

5. Start the application:

   ```bash
   npm run dev
   ```

Environment files are ignored by Git. Never commit credentials, generated
environment files, or local database data.

## URLs

| URL | Purpose |
| --- | --- |
| `/` | Public landing page and lead form |
| `/login` | Admin sign-in form |
| `/admin` | Unprotected lead-management dashboard |
| `POST /api/auth/login` | Validate admin credentials and create a session |
| `POST /api/auth/logout` | Revoke the current session |
| `GET /api/auth/session` | Read the current active identity and expiry |
| `POST /api/leads` | Same-origin public lead submission |
| `GET /api/admin/leads` | Searchable, filterable, paginated lead list |
| `GET /api/admin/leads/:id` | Full lead details |
| `PATCH /api/admin/leads/:id` | Update a lead to `new`, `contacted`, or `closed` |
| `GET /api/health` | Verify that the deployment can reach MongoDB |

`GET /api/admin/leads` accepts `search`, `status`, `sort`, `page`, and
`pageSize`. Search covers name, email, and message. Sort values are `newest`
and `oldest`.

## Data model

MongoDB stores leads with these server-validated fields:

| Field | Type and rules |
| --- | --- |
| `name` | Trimmed string, 1–120 characters |
| `email` | Normalized lowercase email, at most 254 characters |
| `budgetRange` | `under-5k`, `5k-10k`, `10k-25k`, or `25k-plus` |
| `message` | Trimmed string, 1–5,000 characters |
| `status` | `new`, `contacted`, or `closed`; defaults to `new` |
| `createdAt` | Server-owned MongoDB date |
| `updatedAt` | Server-owned MongoDB date |

The collection has `{ status: 1, createdAt: -1 }` and `{ email: 1 }` indexes.
MongoDB documents remain private to the repository; services return mapped
domain objects with string IDs and ISO 8601 timestamps.

## Authentication data model

The `users` collection stores a unique normalized email, a salted scrypt
password hash, account status, and server-owned timestamps. The `sessions`
collection stores a user ID, SHA-256 token hash, expiry, and creation time. Raw
session tokens and plaintext passwords never enter MongoDB.

MongoDB has a unique `{ normalizedEmail: 1 }` user index, a unique
`{ tokenHash: 1 }` session index, and a zero-delay TTL index on
`{ expiresAt: 1 }`. Session reads also require `expiresAt > now`, because TTL
deletion is asynchronous and must not define authorization behavior. See
[`src/modules/auth/README.md`](src/modules/auth/README.md) for provisioning and
module boundaries.

Login attempts are retained for 24 hours with hashed email/IP identifiers.
Five failed attempts within 15 minutes are rate limited. Authentication cookies
are server-only (`HttpOnly`), `SameSite=Lax`, and `Secure` in production; raw
tokens never appear in JSON responses. This branch exposes authentication APIs
but intentionally does not yet protect `/admin` or admin lead APIs.

The login page accepts an optional local `/admin` destination through the
`next` query parameter and rejects external or non-admin redirect targets. Use
`reason=expired` to show the distinct expired-session alert. Incorrect
credentials preserve the entered email, clear and focus the password field, and
show a generic message that does not reveal whether the account exists.

## Task A behavior

- The public form shares its Zod schema with the API, focuses the first invalid
  field, blocks duplicate submissions, and announces loading, success, and
  retryable failure states.
- Successful submissions clear the form. Server failures preserve entered
  values and do not expose database errors.
- The admin dashboard maps search, filters, sort, and pagination to URL state.
- Admin status updates persist and report success or failure with an accessible
  toast.
- Empty-database and no-results states are intentionally different.
- The dashboard uses a table on desktop and cards on mobile without horizontal
  table overflow.

## Validation

```bash
npm run db:setup
npm run db:seed-admin
npm run typecheck
npm run lint
npm test
npm run build
```

The test suite covers validation and service behavior, normalized public and
admin API contracts, form states, dashboard query state, database setup, and a
public-to-admin API journey through all three statuses.

## Visual and accessibility review

Task A was reviewed at 1440px desktop and 390px mobile widths. The smoke flow
covered keyboard navigation, visible focus, form announcements, direct
unprotected admin access, search, lead details, and status persistence. Browser
console errors were checked during the flow.

- [Public form — desktop](docs/task-a/screenshots/public-form-desktop.jpg)
- [Admin dashboard — desktop](docs/task-a/screenshots/admin-dashboard-desktop.jpg)
- [Admin dashboard — mobile](docs/task-a/screenshots/admin-dashboard-mobile.jpg)

Screenshots are verification artifacts from the local Task A application and
contain only synthetic test data.

## Production deployment

- Landing page: <https://leaddesk-mini-flame.vercel.app/>
- Admin dashboard: <https://leaddesk-mini-flame.vercel.app/admin>
- Health check: <https://leaddesk-mini-flame.vercel.app/api/health>

Vercel production configuration requires `MONGODB_URI` as a sensitive
environment variable and `MONGODB_DB_NAME` as a regular environment variable.
The values are configured in Vercel rather than committed to the repository.
After changing the Atlas connection or database name, run `npm run db:setup`
from a trusted environment using those same values before deploying.

The production smoke test uses a synthetic lead and removes it afterward. Task
A intentionally leaves `/admin` and its APIs unprotected.

## Architecture

```text
src/
|-- app/               Next.js pages and route handlers
|-- components/        Reusable UI sections
|-- config/            Validated server environment
|-- infrastructure/    MongoDB connection and collection setup
|-- modules/           Lead domain, repository, service, mapping, and contracts
`-- shared/            Cross-module code only
```
