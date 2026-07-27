# Leads data module

The module owns lead types, input validation, persistence, DTO mapping, and
application services. Next.js components and route handlers must use
`createLeadService`; MongoDB documents remain private to the repository.

## Data model

- `status`: `new`, `contacted`, or `closed` (`new` is assigned on creation)
- `budgetRange`: `under-5k`, `5k-10k`, `10k-25k`, or `25k-plus`
- `createdAt` and `updatedAt`: MongoDB dates, exposed by the service as ISO 8601
- compound index: `{ status: 1, createdAt: -1 }`
- email index: `{ email: 1 }`

Run `npm run db:setup` after configuring `.env.local`. The idempotent command
creates the collection when absent, reapplies its strict validator when present,
and ensures both indexes exist.

## Unprotected Task A admin API

- `GET /api/admin/leads` supports `search`, `status`, `sort`, `page`, and
  `pageSize`; it returns table-safe items, filtered pagination metadata, and
  global dashboard counts.
- `GET /api/admin/leads/:id` returns the complete lead for the details drawer.
- `PATCH /api/admin/leads/:id` accepts only a `status` of `new`, `contacted`, or
  `closed`.

These endpoints are intentionally unprotected for Task A. Authentication and
authorization belong to Task B.
