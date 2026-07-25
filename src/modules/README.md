# Domain modules

LeadDesk Mini uses a modular-monolith structure. Each business capability owns
its domain types, validation, services, and persistence adapters under
`src/modules/<capability>`.

Task A capabilities will be added in focused branches. This foundation branch
does not implement lead submission, the admin dashboard, or any API endpoint.

Authentication is explicitly outside Task A. Do not add auth, user, session,
login, logout, or authorization modules until the Task B branches.
