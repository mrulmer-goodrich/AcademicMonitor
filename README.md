# Academic Monitor

Touch-first academic monitoring for daily classroom decisions.

## Quick start

1. Install dependencies:

```bash
npm install
```

2. Create a local env file:

```bash
cp .env.example .env
```

3. Initialize the database:

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

4. Run the app:

```bash
npm run dev
```

Visit `http://localhost:3000` and login with:

- Email: `demo@academicmonitor.test`
- Password: `demo1234`

## Architecture

- Next.js App Router for UI and API routes
- Prisma + SQLite for persistence (swap to Postgres when ready)
- Touch-first UI, minimal clicks

## Notes

- Auth is a minimal scaffold (cookie-based) and should be upgraded to JWT or a vetted auth library before production.
- NC standards currently seeded with `RP.1`, `RP.2`, `RP.3` in `lib/standards.ts`.
- CSV/XLSX exports are stubbed in the UI.

## Deploy to Vercel

1. Push to GitHub.
2. Create a Vercel project.
3. Set `DATABASE_URL` (SQLite for dev; Postgres recommended for production).
4. Run Prisma migrations in CI or via `prisma db push`.
