# LeadDesk Mini Task B - Loom walkthrough

Target duration: 2 minutes 45 seconds. Hard stop: 3 minutes.

## Publication status

The recording link is intentionally not published yet. On 28 July 2026, the
documented production host returned `404` for `/login`, so it was not a valid
Task B recording target. Record and publish only after the merged Task B
release is deployed and all URL checks below pass.

## Before recording

- Confirm `/`, `/login`, `/admin`, and `/api/health` on the production host.
- Create one synthetic lead with a unique, non-personal email.
- Receive the review admin password privately; never paste it into notes,
  browser devtools, the Loom title, or the description.
- Close password managers, terminals, environment files, notifications, and
  unrelated tabs.
- Use a fresh browser profile at desktop width with the password already stored
  by the browser or paste while recording is paused.
- Confirm the Loom share permission matches the submission requirements.

## Timed script

### 0:00-0:20 - Public submission

Show the landing page and briefly identify LeadDesk Mini. Scroll to "Have a
project in mind?", enter synthetic details, select a budget, submit, and show
the success state.

Suggested narration:

> LeadDesk captures a validated enquiry through the public Task A workflow.
> The form blocks duplicate submission, gives accessible feedback, and stores
> normalized data in MongoDB.

### 0:20-0:45 - Protected entry and login

Open `/admin` in a fresh browser context. Show the redirect to `/login` and the
preserved `next` destination. Enter the privately delivered credentials
without revealing the password and sign in.

Suggested narration:

> Admin access is server protected. A fresh browser is redirected to the
> approved login screen, and successful authentication creates an opaque,
> database-backed HttpOnly session.

### 0:45-1:20 - Search and details

Confirm the dashboard loads, refresh once to demonstrate session persistence,
then search for the synthetic email. Open the lead details drawer and point out
the submitted message and budget.

Suggested narration:

> The session survives refresh because the server verifies the cookie against
> the active session and user records. Search and details use protected admin
> APIs that never return lead data without authorization.

### 1:20-1:55 - Status update

Close the drawer. Change the lead from `new` to `contacted`, show the success
toast, then change it to `closed`. Refresh and show that the status persisted.

Suggested narration:

> Status changes are validated, same-origin protected, persisted in MongoDB,
> and reflected in the dashboard counts.

### 1:55-2:25 - Logout and access denial

Open the authenticated user menu, show the normalized admin email, and choose
"Sign out". Navigate directly to `/admin` again and show the redirect to login.

Suggested narration:

> Logout revokes the database session and clears the cookie. Browser history
> cannot restore access because pages and APIs re-verify the session and use
> no-store responses.

### 2:25-2:45 - Architecture and close

Briefly show the README architecture, data model, private credential policy,
validation commands, and AI-use disclosure.

Suggested narration:

> Task B separates authentication from authorization, stores only password and
> token hashes, throttles repeated failures, and is covered by unit,
> integration, security, and isolated browser tests.

## Publication checklist

- The final video is no longer than about three minutes.
- No password, cookie, token, environment file, private key, or personal data is
  visible in frames, captions, transcript, title, or description.
- The flow includes submission, login, search, status update, and logout.
- The recording uses the deployed Task B application, not localhost.
- The Loom URL opens in a signed-out browser with the intended share setting.
- The final Loom share URL is added to the README.
