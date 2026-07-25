# Leads module boundary

The leads module will own the public lead-capture and admin lead-management
business rules introduced by later Task A branches.

Planned responsibilities:

- lead domain types and validation;
- lead application services;
- MongoDB repository implementations;
- transport-safe data transfer objects.

UI components and Next.js route handlers should call this module rather than
accessing MongoDB directly.
