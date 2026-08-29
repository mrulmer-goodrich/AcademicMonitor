# Worklog

## 2026-08-29 — Recording QA workflow, privacy, and reporting correction

Completed:

- Removed readable student-category letters and EOG values from projected seating and monitoring indicators while preserving their color/pattern identity
- Restored privacy-safe student indicators to their established top-right, bottom-left, and bottom-right desk positions without readable category or EOG characters
- Made Command Center block labels visually continuous with their parent block cards
- Rebuilt Update Students into a denser stable table that keeps row geometry fixed through Edit and unsaved states
- Compacted Add Student so its actions remain visible and all six attributes fit one desktop row
- Replaced selected-student class tools with Edit All, Save All, and Cancel controls that expose every visible roster record at once
- Kept individual Edit rows stable, corrected the EOG selector spacing, and placed Cancel at the former Edit target instead of Delete
- Excluded inactive students and their retained desks from current attendance, seating, monitoring, reporting, performance, and setup-completion data without deleting history
- Restored the complete five-day by three-lap weekly grid at laptop and tablet widths, clarified the active day on phones, and kept all three rows visible in view and edit modes at 1280×720 and 1024×768
- Removed explanatory clutter from weekly lap planning, aligned class/week/edit controls on one desktop and tablet row, and fixed block selection so it no longer resets to the URL's initial class
- Added one compact Copy menu for bringing in the previous week or the displayed week from another active class before review and save
- Centered the Reports title, left-aligned the class selector, and removed report-type switching after a report workspace opens
- Consolidated attendance scope, date navigation, range selection, and export controls into one responsive toolbar
- Added centered previous/next month navigation and distinct visual treatment for Present, Absent, Tardy, Left Early, and no record in individual attendance
- Added day, week, month, and validated custom-range Entire Class attendance views with a compact longitudinal student/date matrix
- Scoped student updates and deletes to the authenticated teacher's active school year

Verification:

- Passed TypeScript and lint checks
- Passed the complete optimized production build; it retained the existing hook-dependency warnings
- Browser-accepted Command Center, Update Students view/edit/add/class-selection states, weekly lap view/edit states, individual and class attendance, seating, and monitoring
- Checked 1280×720, 1024×768, and 390×844 with no page-level horizontal overflow or browser-console warnings/errors
- Confirmed student desktop rows remain exactly 45px tall and fixed at the same viewport position when Edit opens
- Confirmed all 15 weekly lap inputs and standards remain visible without page scrolling in desktop edit mode
- Confirmed seating and monitoring indicators occupy the original three anchor zones with empty circle text, and confirmed the weekly lap toolbar remains aligned without horizontal overflow at 1280×720 and 1024×768
- Confirmed the class selector remains on the chosen block and both copy-source paths return clear empty-source feedback without saving changes
- Confirmed the attendance toolbar, custom range, and centered student month navigation at 1280×720, 768×900, and 390×844 without page-level horizontal overflow
- Confirmed compact Add Student, individual Edit, and Edit All at 1280×720 and 390×844; a reversible local inactivation check removed the student from attendance, seating, and monitoring, then restored the original desk after reactivation

## 2026-08-25 — First-day attendance and classroom workflow correction

Completed:

- Made student-desk creation single-flight and server-idempotent, added Add All, and placed new desks into open grid positions
- Added a visible warning and highlight for overlapping desks while preserving drag-and-drop correction
- Reserved a stable save-status row so the seating chart no longer jumps when Saved appears
- Expanded setup and monitoring canvases to use available desktop width without changing classroom coordinates
- Made Attendance List available for every active student before seating is complete while keeping seat-map attendance and lap monitoring seating-gated
- Reworked Command Center cards to fit at normal desktop zoom with side-positioned icons and compact weekly summaries
- Clarified completed attendance as recorded statuses and displayed the actual present, absent, tardy, and left-early mix
- Forced fresh Command Center data on every server render and hard-refreshed all Return to Dashboard actions
- Anchored the Command Center's current day to the configured school timezone so evening records do not disappear at midnight UTC
- Removed internal canvas padding that could clip the final grid line or a desk positioned at the classroom's bottom boundary
- Disabled student-import controls during processing and exposed progress and partial-failure feedback

Verification:

- Passed `tsc --noEmit` and `git diff --check`
- Development-compiled dashboard, seating, monitor, and related API routes without browser console errors
- Visually accepted Command Center, seating setup, locked seat-map attendance, and the full active-student Attendance List at 1280×720 and normal zoom
- Read-only production verification confirmed all August 25 attendance records remained intact: 22 present in Block 1 and 20 present plus 7 absent in Blocks 2 and 3
- Stopped `next build` after it stalled silently during optimized compilation; this remains an explicit local verification blocker

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
