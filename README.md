# LeadDesk Mini

LeadDesk Mini is a Next.js and TypeScript application for capturing project
enquiries and managing their progress.

This branch establishes the Task A application foundation only. It intentionally
does not include authentication, login, user/session storage, protected routes,
or authorization middleware.

## Requirements

- Node.js 20.9 or newer
- npm
- MongoDB Atlas or a local MongoDB instance

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and replace the example MongoDB values.

3. Start the development server:

   ```bash
   npm run dev
   ```

Environment files are ignored by Git. Only `.env.example` is tracked, and it
must contain placeholders rather than real credentials.

## Validation

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Architecture

```text
src/
├── app/               Next.js application shell
├── config/            Validated server environment
├── infrastructure/    External services such as MongoDB
├── modules/           Domain-oriented business capabilities
└── shared/            Cross-module code only
```

MongoDB access is centralized in `src/infrastructure/database/mongodb.ts`.
Business modules must depend on that adapter instead of creating database
clients independently.
