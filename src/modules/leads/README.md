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
