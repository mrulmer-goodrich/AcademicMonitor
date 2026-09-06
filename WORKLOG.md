# Worklog

## 2026-09-06 — Post-release teacher workflow polish

Completed:

- Replaced native browser confirms and prompts with one reusable, accessible product overlay for grade changes, destructive actions, unnamed laps, and historical monitoring warnings
- Added a once-per-prior-date-entry monitoring warning that stays dismissed while the teacher remains on that date and returns after navigating away and back
- Strengthened school-year grouping, allowed individually archived current-year classes to be restored, and removed fixed-height scrolling from Classes & Years
- Reworked Command Center shortcuts into a compact segmented navigation row that keeps the heading on one line
- Added breathing room around Weekly Lap Plan navigation, contained edit-mode week controls, and prevented long lap names from escaping their cells
- Put student and teacher desk creation on one stable Seating row, replaced More with Delete, removed Clear Selection, and made a second click clear a selected desk
- Let the Students table grow with the page while retaining its sticky column header
- Standardized attendance and monitoring report controls into the same two-row, three-position grid with aligned range and date controls and right-justified exports
- Centered longitudinal report cells; replaced textual totals with fixed-position colored count circles; left zero slots blank; and removed unrecorded named laps from monitoring totals
- Made monitoring lap defaults reflect actual evidence for each date, including valid zero-lap and multi-lap defaults, and stacked date-specific lap selectors inside their report headers
- Replaced the stalling framework lint wrapper with a direct application-source ESLint command and added explicit typecheck and complete verify commands

Verification:

- Browser-accepted Command Center, Classes & Years, class-grade warning, Weekly Lap Plan view/edit, Seating controls, Students, historical-date warnings, unnamed-lap warning, and shared attendance/monitoring report controls at 1280 px
- Confirmed prior-day warnings appear once while staying on a date, reappear on a different prior date, and reappear when returning to the original prior date
- Confirmed the browser console remained free of warnings and errors across the final monitoring flow
- Direct ESLint completed with zero errors and the nine pre-existing hook-dependency warnings; strict TypeScript, whitespace validation, and the optimized production build passed

Decisions:

- Restoring a class applies to a manually archived class in the current school year; historical-year classes remain historical so restoring cannot silently reactivate an old year
- Report totals represent recorded evidence only; a named lap without a score is visually empty and does not become a fourth result category
- Shared report controls retain the same six spatial positions for both report types, while individual reports use a fixed descriptive range slot

## 2026-09-06 — Teacher feedback, multi-grade standards, and historical evidence

Completed:

- Removed the global marketing header from authenticated workspace routes while retaining it on public pages; added direct Account, Public Website, and Logout actions to Command Center
- Expanded the Command Center accent to the full heading width, reordered setup shortcuts, renamed Other Reports to Reports, and made Weekly Data Collected open the selected block's weekly monitoring report
- Stabilized the Students table geometry and moved the active count into its compact action row
- Rebuilt Classes & Years as a compact sortable, school-year-grouped table with archived visibility, guarded `YY/ZZ` labels, and inline editing
- Added a non-empty multi-grade assignment to every block so a Grade 7 honors block can audit Grade 7 and Grade 8 standards in the same year
- Replaced legacy unqualified standards with fully qualified Grade 6–8 NC math codes and concise descriptions based on NCDPI standards and unpacking resources
- Cleared only standard selections when a block's assigned grades change, preserving lap names and historical performance
- Compacted Weekly Lap Plan, standardized Command Center navigation, moved week navigation right, wrapped long lap names, and returned directly to the requested monitor date and lap
- Reworked Seating into an assignment-first toolbar, removed routine status clutter, retained visual-only overlap feedback, added multi-select movement/rotation, arrow-key movement, and a contextual remove action
- Added a database uniqueness constraint and server idempotence so one student cannot receive duplicate desks
- Allowed Monitoring to open with independently named laps, removed prerequisite-warning flashes, added guarded historical date navigation across the active school year, and preserved the existing serialized autosave behavior
- Added week, month, and custom-range Monitoring Reports with independent per-day lap selection, grouped day cells, per-student and per-day color totals, and date-bearing CSV/XLSX rows
- Alphabetized longitudinal report students, added per-student and per-day attendance totals, tightened report selectors, and changed absent monitoring desks to gray with a visible name and ABSENT banner

Verification:

- Prisma formatting and client generation completed
- Strict TypeScript, Prisma schema validation, `git diff --check`, and the optimized `next build --no-lint` production compile passed after implementation
- Focused checks passed for school-year normalization, multi-grade deduplication, legacy `G1` to `7.G.1` qualification, preservation of already-qualified Grade 8 codes, and the exact 31/23/25 Grade 6/7/8 standard counts
- Both the full build's lint phase and a focused direct ESLint run stopped making progress locally and were terminated without a result
- Audited the configured Railway data before applying the schema: 22 blocks and no duplicate student-desk assignments
- Applied the Prisma schema, verified all 22 existing blocks received the Grade 7 default, and verified the student-desk uniqueness constraint against existing data
- Backfilled 27 legacy standard references to fully qualified Grade 7 codes and verified no unqualified references remain
- Assigned the active 26/27 Honors Math block to both Grade 7 and Grade 8 so its lap planner can audit the union of both standards libraries
- Browser-accepted Command Center, Students, Classes & Years, Weekly Lap Plan, Seating, historical Monitoring, report selection, and multi-day Monitoring Reports at 1280×720 with no page-level overflow or console warnings/errors
- Confirmed historical Monitoring derives the full active-year date range from both short and legacy long-form school-year labels
- Chrome breakpoint emulation was unavailable during the final pass because another extension panel held browser control; the responsive implementation preserves the previously accepted tablet and phone layout contracts

Decisions:

- Block grade ownership is a set rather than a single value; standards shown in lap planning are the union of every assigned grade
- Existing blocks receive Grade 7 by default when the schema is applied
- Standard codes persist with their grade prefix so mixed-grade reporting remains unambiguous
- Historical monitoring is editable only from the active school-year start through the current school day
- Changing grade ownership invalidates standard selections but does not invalidate lap names or recorded evidence

## 2026-09-01 — Monitoring entry, reports, and lap-name recognition

Completed:

- Changed the current-day lap lookup from exact `weekStart` timestamp equality to the matching Monday calendar-day window
- Preserved existing Named Laps records saved at the teacher browser's local midnight while allowing the server-rendered dashboard to find them from its school-date midnight
- Kept the correction read-only and backward-compatible, with no production-data rewrite or schema migration
- Reused the calendar-day week-anchor lookup in class monitoring reports so successive named days in the same week resolve correctly
- Changed Monitoring to open with no selected laps, bolded the selection instruction, dimmed and disabled the classroom map until a named lap is selected, and clarified that multiple laps can be monitored together
- Made performance taps auto-save through a serialized, short-batch queue so rapid classroom input cannot complete out of order; Command Center navigation flushes pending monitoring changes, while attendance retains explicit batch saving
- Renamed shared Return to Dashboard controls to Command Center and strengthened the Command Center heading with weight, contrast, and a compact accent without changing surrounding layout dimensions
- Made class monitoring reports default to the first named lap, clearly invite one-or-more-lap selection, and scale attendance and monitoring classroom maps to the full available width

Verification:

- Reproduced the browser/server mismatch with an Eastern browser anchor of `2026-08-31T04:00:00.000Z` and confirmed it falls inside the corrected server window of `2026-08-31T00:00:00.000Z` through, but not including, `2026-09-01T00:00:00.000Z`
- Passed strict TypeScript and the complete optimized production build; the build retained the existing hook-dependency warnings
- Browser-checked the Command Center at desktop width with no visual regression and no browser-console warnings or errors; did not create verification records because the configured database is external
- Browser-checked the stronger Command Center heading, Command Center navigation labels, monitoring autosave copy, and the expanded class report map with no browser-console warnings or errors

## 2026-08-29 — Recording QA workflow, privacy, and reporting correction

Completed:

- Removed readable student-category letters and EOG values from projected seating and monitoring indicators while preserving their color/pattern identity
- Restored privacy-safe student indicators to their established top-right, bottom-left, and bottom-right desk positions without readable category or EOG characters
- Made Command Center block labels visually continuous with their parent block cards
- Rebuilt Update Students into a denser stable table that keeps row geometry fixed through Edit and unsaved states
- Compacted Add Student so its actions remain visible and all six attributes fit one desktop row
- Replaced selected-student class tools with Edit All, Save All, and Cancel controls that expose every visible roster record at once, with the desktop controls aligned over the row Edit actions
- Kept individual Edit rows stable, corrected the EOG selector spacing, and placed Cancel at the former Edit target instead of Delete
- Excluded inactive students and their retained desks from current attendance, seating, monitoring, reporting, performance, and setup-completion data without deleting history
- Restored the complete five-day by three-lap weekly grid at laptop and tablet widths, clarified the active day on phones, and kept all three rows visible in view and edit modes at 1280×720 and 1024×768
- Removed explanatory clutter from weekly lap planning, aligned class/week/edit controls on one desktop and tablet row, and fixed block selection so it no longer resets to the URL's initial class
- Added one compact Copy menu for bringing in the previous week or the displayed week from another active class before review and save
- Centered the Reports title, left-aligned the class selector, and removed report-type switching after a report workspace opens
- Consolidated attendance scope, compact date navigation, contained custom-range inputs, and secondary export controls into one responsive toolbar with a consistent type hierarchy
- Grouped previous/next month controls directly around the centered month label and retained distinct visual treatment for Present, Absent, Tardy, Left Early, and no record in individual attendance
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
- Confirmed the compact attendance exports, bounded custom range, and adjacent student month navigation at 1280×720 and 390×844 without page-level horizontal overflow
- Confirmed compact Add Student, individual Edit, and Edit All at 1280×720 and 390×844, including desktop Edit All alignment over the row actions; a reversible local inactivation check removed the student from attendance, seating, and monitoring, then restored the original desk after reactivation

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
