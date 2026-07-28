# Authentication data module

This module owns admin identities, password hashing, and opaque database-backed
sessions. It intentionally does not expose HTTP routes, cookies, or admin-route
protection; those belong to later Task B branches.

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
