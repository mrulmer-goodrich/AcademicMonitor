# Worklog

## 2026-08-24 — School-year rollover and classroom canvas fit

Completed:

- Made the shared classroom canvas fit both available width and height so older bottom-row desk positions are not clipped
- Normalized historical desk coordinates into the supported classroom bounds across seating setup, attendance/monitoring, and seating-chart reports
- Expanded seating and live monitoring workspaces on large screens while preserving proportional touch targets
- Separated active classes from a collapsible archived section and grouped historical classes by editable school-year labels
- Required concise `25/26` school-year labels and added a guarded new-year rollover that preserves the prior year's records
- Kept archived classes out of normal setup and monitoring block lists

Decisions:

- School year remains the owner of class history; blocks do not receive a duplicate year field
- Starting a new year archives the complete prior school year without cloning classes, students, or seating charts
- Older out-of-bounds desk coordinates are corrected when rendered; ordinary drag saves remain clamped at the API boundary

## 2026-07-26 — Site-wide classroom and reporting polish

Completed:

- Added one shared responsive classroom canvas for seating setup, live monitoring, and class reports
- Preserved proportional seat contents, including names, category indicators, EOG markers, and lap performance slices
- Enabled clearly labeled weekend test sessions with three test laps
- Excluded Saturday and Sunday attendance and performance data from standard reports and dashboard weekly totals
- Reworked Command Center into wide-screen, Chromebook, tablet, and phone layouts without page-level horizontal overflow
- Added an optional guided setup page while keeping direct mid-year access to every setup screen
- Added tablet and phone student cards, a single-day lap planner, and a Copy Previous Week action
- Replaced the unfinished individual-student monitoring report with a dated lap-by-lap report
- Added CSV export alongside XLSX, persistent block selection, responsive date controls, loading placeholders, and responsive report seating charts
- Stabilized the header, simplified the footer, added visible keyboard focus, and disabled fixed backgrounds on small screens
- Removed two unused interface components
- Verified a successful production build and checked the main flows at 1366×768, 1024×768, 768×1024, and 390×844 with no browser console errors

Remaining:

- Validate touch dragging on the classroom iPad with the teacher's real seating layout
- Consider multi-week student trend charts and a print-specific report layout in a later reporting pass

Decisions:

- Classroom coordinates remain unchanged; the complete classroom scene scales as one unit at Chromebook and tablet widths
- Phones retain a minimum classroom scale and use intentional horizontal movement instead of shrinking touch targets too far
- Guided setup is optional and never blocks direct one-off changes
- Weekend records are identified by their calendar date, require no schema migration, and remain available for testing while standard reports stay Monday through Friday
- ESLint uses the standard Next.js core-web-vitals rules and runs non-interactively

## 2026-07-26 — Repository cleanup

Completed:

- Consolidated product status, setup, commands, structure, and core behavior into `README.md`
- Added focused project rules, next-task tracking, and a durable worklog
- Removed eleven obsolete developer-note dumps and the duplicate specification
- Removed an unused design screenshot, an empty placeholder file, TypeScript build metadata, and all generated Next.js build folders
- Expanded ignore rules so generated Next.js variants and TypeScript build metadata do not return
- Verified the app with a successful production build before cleanup

Remaining:

- Define the next site-wide design or behavior change
- Add automated tests as future behavior changes are implemented

Known limitations:

- Password reset is stubbed
- Standards are built into the codebase
- School-year archive/clone management is incomplete in the interface

Decision:

- Git history is the archive for old implementation prompts. Current documentation should describe only the product as it exists and the work that is actually next.
