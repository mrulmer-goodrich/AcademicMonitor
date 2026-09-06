# Project Rules

## Build and verification

- Use Node.js 20 or newer.
- Run `npm run build` before considering a code change complete. The build includes lint and TypeScript validation.
- Run the relevant workflow in the browser for interface changes.
- There is currently no automated test suite. Add focused tests when introducing logic that can be tested independently.
- Never use production data for local development or verification.

## Code style

- Keep TypeScript strict and avoid `any` unless an integration makes it unavoidable.
- Prefer small shared components and utilities over duplicated page logic.
- Keep API validation at the route boundary and database access in server-side code.
- Preserve the touch-first workflow: primary actions should be obvious, fast, and usable without precision gestures.
- Match existing Tailwind patterns and shared classes in `app/globals.css` before adding new visual conventions.

## Data and security

- Scope teacher-owned records by authenticated user and school year.
- Preserve historical attendance and performance data when names or active status change.
- Do not reuse a student's seat number within a school year.
- Do not commit `.env` files, database credentials, local databases, or real student information.
- Treat schema changes as data migrations, even while local development uses `prisma db push`.
- Apply schema changes to a verified non-production database before browser acceptance; never run `db:push` against the configured external database without explicit deployment authorization.
- Store block grade ownership as a non-empty Grade 6–8 set and persist fully qualified standard codes such as `7.G.1`.

## Documentation

- `README.md` explains the product, current status, setup, commands, and architecture.
- `NEXT_TASK.md` contains only active work, blockers, and near-term decisions.
- `WORKLOG.md` records completed work and durable implementation decisions.
- Update an existing entry instead of adding duplicate notes.
- Do not create numbered developer-note files. Put durable information in the appropriate document and rely on Git history for obsolete implementation notes.

## Git

- Work in the existing local checkout unless the user requests a branch or pull request.
- Keep generated output, dependencies, secrets, and local data out of Git.
- Keep commits focused and describe the user-visible outcome.
