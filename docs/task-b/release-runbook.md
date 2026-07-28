# Task B production release runbook

This runbook performs deployment-only work. It does not change application UI
or expose assessment credentials.

## Release gates

- The documentation PR and this release PR are merged to `main`.
- `main` is clean and matches `origin/main`.
- MongoDB and Vercel production configuration is available to the releaser.
- Assessment credentials have been delivered through a private secret channel.
- The production dependency audit, build, secret audit, and E2E suite pass.

## 1. Prepare production storage and the assessment admin

Set these values in a trusted local shell or ignored `.env.local`:

```dotenv
MONGODB_URI=<production MongoDB connection string>
MONGODB_DB_NAME=<production database>
ADMIN_EMAIL=<privately delivered assessment email>
ADMIN_PASSWORD=<privately delivered assessment password>
RELEASE_BASE_URL=<HTTPS production origin>
```

Run:

```bash
npm ci
npm run release:prepare
```

The command idempotently applies the leads/users/sessions/login-attempt
validators and indexes, provisions or rotates the normalized assessment admin,
and verifies that every required index exists. It prints the normalized email
but never the password or stored hashes.

## 2. Deploy

Deploy the verified `main` commit through the existing Vercel project. Configure
only `MONGODB_URI` and `MONGODB_DB_NAME` for application runtime. Admin seed
credentials belong in the trusted release shell, not in public/client Vercel
variables.

Record the immutable deployment URL and commit SHA in the release evidence.

## 3. Verify production

Run:

```bash
npm run release:verify
```

The verifier:

- checks health and the login page;
- confirms a fresh `/admin` request redirects with a return URL;
- confirms unauthenticated admin API access returns `401`;
- creates one uniquely named synthetic lead through public `POST /api/leads`;
- logs in with the runtime-only assessment credentials;
- checks the admin page twice to prove session persistence;
- searches for the synthetic lead and persists a closed status;
- logs out and confirms the old session receives `401`;
- deletes the synthetic lead in `finally`, including after a failed check.

Do not record the command or environment values in Loom.

## 4. Verify repository state and tag

Only after production verification succeeds:

```bash
git switch main
git pull --ff-only
git status --short
git tag -a v0.1.0 -m "LeadDesk Mini Task B verified release"
git push origin v0.1.0
git show --no-patch --decorate v0.1.0
```

`git status --short` must be empty, and `v0.1.0` must resolve to the same commit
as `origin/main`. Never move or recreate a published release tag; correct a
failed release with a new version.

## 5. Complete evidence

- Add the verified live `/`, `/login`, `/admin`, and `/api/health` URLs to the
  README.
- Record the three-minute Loom using `docs/task-b/loom-walkthrough.md`.
- Deliver the assessment password privately and rotate/disable it after review.
- Add the Loom URL without exposing credentials or browser secrets.
