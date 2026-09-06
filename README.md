# Academic Monitor

Academic Monitor is a touch-first classroom tool for recording attendance and student performance during three instructional laps, then reviewing and exporting the results.

## Current status

The core teacher workflow is implemented:

- Account registration, login, profile, and password changes
- Required school-year-scoped blocks and students, with archived-year rollover and one-or-more instructional grades per block
- Student categories, EOG levels, and active/inactive status
- Compact student management with complete single-student setup and Edit All attribute changes
- Drag-and-drop seating charts with student and teacher desks
- Three named laps per instructional day, with previous-week and same-week cross-class copying and Grade 6–8 NC math standards
- Attendance gating before monitoring begins
- Tap-to-cycle performance capture: proficient, developing, and nothing written
- Privacy-safe classroom indicators that preserve their established desk positions and teacher color/pattern cues without projected category labels or EOG values
- Day, week, month, custom-range, individual, monitoring, and attendance reports with CSV/XLSX export
- Historical monitoring entry from the active school-year start through the current school day
- Responsive classroom layouts that keep seats, indicators, and lap controls together across Chromebook and tablet sizes
- Weekend test sessions that can be used for practice without entering standard reports
- Public landing, about, and contact pages

The optimized production compile and strict TypeScript checks pass. The full local lint scan can stall after compilation in this environment. There is no automated test suite yet.

Known limitations:

- Authentication uses a lightweight cookie/JWT implementation
- Password reset is a stub; signed-in password changes work
- The built-in standards library currently covers NC Grade 6–8 mathematics; other grades and subjects are not yet included
- Starting a new school year preserves the prior year and its classes in a collapsible archive; automatic class cloning is not implemented

See [NEXT_TASK.md](NEXT_TASK.md) for current work and [WORKLOG.md](WORKLOG.md) for recent changes.

## Technology

- Next.js 14 App Router, React, and TypeScript
- Tailwind CSS
- Prisma with PostgreSQL
- `xlsx` for report exports

## Local setup

Requirements: Node.js 20+, npm, and PostgreSQL.

```bash
npm install
cp .env.example .env.local
```

Set `DATABASE_URL` in `.env.local`. `SCHOOL_TIME_ZONE` defaults to `America/New_York` and can be overridden with another IANA timezone. Then initialize and run the app:

```bash
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

The seed script creates this local demo account:

- Email: `demo@academicmonitor.test`
- Password: `demo1234`

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run build` | Compile, lint, and type-check a production build |
| `npm run start` | Run the compiled production build |
| `npm run lint` | Run Next.js lint checks |
| `npm run db:generate` | Generate the Prisma client |
| `npm run db:push` | Apply the Prisma schema to the configured database |
| `npm run db:seed` | Seed local demo data |

## Project structure

```text
app/          Pages and API routes
components/   Shared interface components
lib/          Authentication, database, standards, and shared utilities
prisma/       PostgreSQL schema
public/       Images served by the app
scripts/      Database seed script
```

## Core product rules

- A teacher's data is scoped to a school year.
- A block is a class period within that school year.
- A block owns one or more instructional grades, so accelerated classes can use standards from multiple grades in the same school year.
- Each student receives an immutable internal ID and a school-year seat number that is never reused.
- A teaching day has exactly three lap positions; each position can be named and monitored independently.
- Attendance List is available before seating is complete; seat-map attendance and lap monitoring require every active student to have a desk.
- Attendance is complete when every active student has a recorded status. The Command Center separately summarizes present, absent, tardy, and left-early totals.
- Weekday monitoring requires a seated class and at least one named, selected lap; incomplete attendance produces a warning without blocking the teacher.
- Student imports and desk creation are single-flight operations so repeated clicks cannot create overlapping requests.
- Saturday and Sunday monitor records are test data and are excluded from standard reports and weekly reporting totals.
- Desk segments run left to right from Lap 1 through Lap 3.
- Tapping a segment cycles green to yellow to red and back to green.
- Monitoring opens with no laps selected; teachers may select one or more named laps, and performance taps save automatically in order.
- Monitoring dates are limited to the active school year through the current school day; pending performance saves flush before changing dates.
- Attendance remains an explicit batch-save workflow, while Command Center navigation flushes any pending monitoring save before leaving.
- Class monitoring reports default to the first named lap for each date, support day/week/month/custom ranges, and allow an independent lap selection for every reported date.
- Absent students are masked and cannot be scored.

## Deployment

The app is designed for Vercel with a PostgreSQL database such as Railway Postgres.

1. Configure `DATABASE_URL` in the hosting environment.
2. Apply the schema with `npm run db:push` or a migration-based production workflow.
3. Build with `npm run build`.

Do not commit environment files, local databases, dependencies, or generated Next.js output.
