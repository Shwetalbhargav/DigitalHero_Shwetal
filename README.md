# LeadDesk Mini — Task A

LeadDesk Mini is a Next.js and TypeScript application for capturing project
enquiries and managing their progress in a lightweight admin dashboard.

Task A deliberately has no authentication or authorization. The public page,
`/admin`, and all admin API routes are directly accessible. Login, users,
sessions, protected routes, and role checks are reserved for later work.

## Requirements

- Node.js 20.9 or newer
- npm
- MongoDB Atlas or a local MongoDB instance

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and replace its placeholder values:

   ```dotenv
   MONGODB_URI=mongodb://127.0.0.1:27017
   MONGODB_DB_NAME=leaddesk
   ```

3. Create or update the validated collection and indexes:

   ```bash
   npm run db:setup
   ```

   The command is idempotent. It creates the `leads` collection when missing,
   reapplies its strict validator when present, and ensures the required indexes
   exist.

4. Start the application:

   ```bash
   npm run dev
   ```

Environment files are ignored by Git. Never commit credentials, generated
environment files, or local database data.

## URLs

| URL | Purpose |
| --- | --- |
| `/` | Public landing page and lead form |
| `/admin` | Unprotected lead-management dashboard |
| `POST /api/leads` | Same-origin public lead submission |
| `GET /api/admin/leads` | Searchable, filterable, paginated lead list |
| `GET /api/admin/leads/:id` | Full lead details |
| `PATCH /api/admin/leads/:id` | Update a lead to `new`, `contacted`, or `closed` |

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
