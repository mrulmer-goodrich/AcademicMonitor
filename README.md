# Academic Monitor v1.1 — Comprehensive Spec & Build Guide

This document replaces prior v0/v1 drafts and serves as the **single, comprehensive source of truth** for the **v1.1 initial build**. It incorporates all original requirements plus refinements based on the current implementation.

---

## 1. Product Vision & Principles

### Product Goal
A professional, elegant, touch‑first academic monitoring tool that enables teachers to capture lap‑level performance in seconds, reduce clicks, and produce usable reports.

### Experience Principles
- **Touch‑first**: All primary actions must be single‑tap. No long‑press or precision gestures.
- **Zero‑lag**: Seat interactions must feel instantaneous (optimistic updates).
- **Minimal clicks**: Straight‑line workflows for Setup → Monitor → Report.
- **Dense visibility**: Maximize screen space and minimize scrolling.
- **Durable data**: Data persists per teacher across devices and school years.

---

## 2. Scope (v1.1)

### In Scope
- Teacher login with password (single teacher per dataset).
- Blocks, Students, Seating Chart, Laps, Attendance, Lap Performance.
- SeatDisplay with lap split + tap‑to‑cycle colors.
- Reports: class and student views with filters and exports.
- About/Contact pages (placeholder copy for now).

### Out of Scope
- AI grouping or predictive analytics.
- Multi‑teacher shared classes.
- Student/parent logins.
- District‑wide aggregation dashboards.
- Offline mode or native mobile apps.
- SIS/LMS integrations.
- Full accessibility certification beyond touch usability.
- Automatic device orientation detection (manual only if ever added).

---

## 3. Core Definitions

- **Block**: A class period. Unique per teacher per SchoolYear.
- **Lap**: One of three instructional segments within a class period on a given day.
- **SeatDisplay**: Interactive monitoring view where desks are tapped.
- **SeatNumber**: Monotonically increasing per SchoolYear, never reused.

---

## 4. Identity, Persistence & School Year Rules

### Students
- Each student has a system‑generated immutable **StudentUUID** (internal only).
- Teachers see a **Display Name** (editable).
- Conceptual anchor: `SchoolYear + BlockNumber + SeatNumber`.
- Display name changes must relabel historical data (no data loss).

### Seat Identity
- SeatNumbers are never reused within a SchoolYear.
- Inactivating a student also inactivates their SeatNumber.
- Historical data remains fully reportable.

### School Year
- All data is scoped to **SchoolYear**.
- SchoolYears can be archived (read‑only) and cloned into a new year.

---

## 5. Laps (Hard Gate)

- Exactly **3 laps per instructional day**.
- Laps must be named **before SeatDisplay unlocks**.
- Laps can optionally reference NC standards (format: `RP.1`).

---

## 6. Attendance (Required Gate)

- Attendance is required before SeatDisplay unlocks.
- Statuses: **Present**, **Absent**, **Tardy**, **Left Early**.
- Attendance actions are timestamped.
- Bulk actions: **Mark All Present**, **Mark All Absent**.

---

## 7. SeatDisplay Interaction

### Unlock Conditions
SeatDisplay is locked until:
- A Block is selected
- Attendance is completed
- All 3 laps are named
- At least one lap is selected

### Lap Display
- Selecting 1 lap: full seat is clickable.
- Selecting 2 laps: seat splits into 2 equal vertical regions.
- Selecting 3 laps: seat splits into 3 equal vertical regions.
- Lap order is always **left → right = Lap 1 → Lap 3**.

### Performance Cycle
- Tap a lap segment to cycle:
  **Green (Proficient)** → **Yellow (Developing)** → **Red (Nothing Written)** → Green …

### Absent Students
- Strong visual mask.
- Non‑interactive while absent.

---

## 8. Student Categories & EOG

Category circles always tied to student seat and shown wherever the student name appears on a desk. All circles have black outlines and equal size.

### Categories
- **ML**: light blue (bottom row)
- **ML New**: light blue striped (bottom row)
- **IEP/504**: pink (bottom row)
- **EC**: yellow (bottom row)
- **CA**: white (bottom row)
- **HIIT**: purple (top‑left)

### EOG (Prior Year)
- **5**: dark blue
- **4**: green
- **3**: orange
- **NP**: red
- Displayed in a circle (top‑right)

---

## 9. Setup Requirements

### Blocks
- Add, edit, archive, delete (with safeguards).

### Students
- Add, edit, inactivate.
- Import via paste list (one per line; optional block number after comma).

### Seating Chart
- Add Student Desk (linked to Student + SeatNumber) and Teacher Desk.
- Drag/drop desks with snap‑to‑grid option.
- Desks can snap together and move as groups.
- Rotate desks and rotate grouped desks.
- Auto‑fit desks to room.

### Laps
- Weekly grid (Mon–Fri) with 3 laps/day.
- If week is empty, prompt to copy from another block.
- Lap edit overlay with standard picker.

---

## 10. Monitor Requirements

- Minimal top bar with Block selector, Attendance controls, Lap toggles.
- Attendance Panel for per‑student status changes.
- Simulate date selector for testing.

---

## 11. Reports

### Filters
- Blocks
- Students
- Laps
- Days
- Student Categories (OR/AND)
- Standards

### Views
- **Class View** (table of students x laps/days)
- **Student View** (single student; time‑ordered laps)

### Exports
- CSV
- XLSX

---

## 12. Current Implementation Status (v1.1)

### Implemented
- Full setup flows (Blocks, Students, Seating, Laps).
- Attendance gating + seat performance capture.
- Lap split display and tap‑to‑cycle colors.
- Reports with multi‑week range + exports.
- Category and EOG indicators shown on desks.

### Known Limits (acceptable for v1.1)
- Auth is minimal (cookie‑based).
- Standards list stubbed with RP.1–RP.3.
- About/Contact pages are placeholder content.

---

## 13. Architecture & Stack

- **Next.js** App Router
- **Prisma** ORM + **Postgres** (Railway/Vercel Postgres)
- **Tailwind CSS** for UI

---

## 14. Quick Start (Dev)

```bash
npm install
cp .env.example .env
# set DATABASE_URL in .env to your Railway Postgres URL
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

Demo login:
- Email: `demo@academicmonitor.test`
- Password: `demo1234`

---

## 15. Deploy to Vercel

1. Push to GitHub.
2. Create a Vercel project.
3. Set `DATABASE_URL` to your Postgres URL.
4. Run Prisma migrations in CI or via `prisma db push`.

---

## Railway Postgres Setup (Recommended if Vercel Postgres is unavailable)

If you’re using Railway for Postgres, follow this once:

1. In Railway, create a new **PostgreSQL** service.
2. Copy the **DATABASE_URL** (starts with `postgresql://`).
3. In Vercel → Project → Settings → Environment Variables, add:
   - Name: `DATABASE_URL`
   - Value: your Railway Postgres URL
   - Environment: Production (and Preview if you want)
4. Run once locally to create tables:

```bash
DATABASE_URL="paste_railway_url_here" npm run db:push
```

If you see `${{ Postgres.DATABASE_URL }}` in a guide, that is a provider variable reference.
For Railway, you should paste the actual URL value from Railway into Vercel’s `DATABASE_URL`.

---

## 16. Roadmap (Post‑v1.1)

- Robust auth (JWT/NextAuth)
- Expanded standards libraries
- Multi‑grade/subject support
- AI‑assisted grouping (future)
- Improved analytics and dashboards
