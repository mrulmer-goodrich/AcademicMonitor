AcademicMonitoring.com
Consolidated Change List (Post-UPDATES FROM DEVNOTES1)

This list supersedes earlier notes. Assume prior items were addressed unless restated here.

1. Global Header & Logo
Logo sizing + constraints

Current rendered logo is effectively 48×48 (or 56×56 including padding).

The logo is being constrained by header padding and/or fixed container sizing.

Requirement:

Increase logo size significantly (≈2× current visual size).

Reduce header padding if needed.

Allow logo to visually dominate the header instead of floating small inside it.

Logo click behavior (context-aware)

Desired behavior:

If user is logged in and anywhere inside the app → clicking logo returns to Dashboard

Only when user is already on the Dashboard → clicking logo returns to public landing page (IT CURRENTLY DOES NOT)

Remove any extra “Home” text button from the dashboard.

The logo should handle navigation alone.

2. Landing Page (Marketing)
App name prominence

The Academic Monitoring pill/container on the landing page is too small.

It should:

Be as wide and visually dominant as the “See learning while it’s happening” tagline.

Clearly read as the product name, not a secondary badge.

Scale it up to fill the available horizontal space.

3. Contact Page – Message Handling
Form destination (critical)

Clarify and confirm where contact messages go.

Requirement:

Messages must route to your CMS email account.

If easier/cleaner, set up a dedicated email like:

contact@academicmonitoring.com

Developer must document:

Which email receives submissions

Whether it’s handled via:

SMTP

API (e.g., SendGrid, Resend, etc.)



4. Dashboard (Core UX Problem)
Dashboard purpose clarification

The dashboard is meant to be a cockpit, not a menu.

Primary user action = Monitor

Setup and reporting are secondary and infrequent.

Visual hierarchy requirement

Monitoring must be larger, louder, more obvious than Setup or Report.

Current grid of 6 equal cards is wrong.

Required direction (choose one):

Make Monitor a dominant, oversized primary tile

Or separate layout:

One large Monitor panel

Smaller Setup / Report / Configuration panels

Direct access expectation

From Monitor, user should be able to access the most recent monitoring view directly

No unnecessary intermediate pages

5. Students Setup Page (Major UX Bugs)
Save/Edit state bug

Current behavior is broken:

Clicking Save often does nothing

Row stays in Save/Cancel mode

Fields remain editable

User can add new students while another row is mid-edit

Editing a new row silently cancels edit state of the previous row

Required behavior

Only one row editable at a time

Clicking Save:

Commits changes

Returns row to read-only

Replaces Save/Cancel with Edit

Clicking Cancel:

Reverts changes

Returns to read-only

Adding a student should be blocked or disabled while another row is in edit mode

Remove instructional clutter

Remove text:

“Rows are read only until you click edit”

The UI should make this obvious without explanation.

6. Student Import UX (Redesign)
Current issue

Import UI takes up too much permanent space

Creates dead space and awkward layout

Required redesign

Replace visible import area with:

“Import list” button

Clicking button opens:

Modal or expandable panel

Single text area:

“Paste student names and block numbers”

Save/import from that modal

Close modal → clean main layout restored

7. Laps Setup Page (High Priority)
Text overflow bug

Lap text currently:

Forces container width to grow

Creates horizontal scrolling

Fix:

Text must wrap inside container

Containers must not expand horizontally

Copy laps functionality (remove)

Copy laps behavior is:

Confusing

Buggy

Non-functional

Remove copy laps entirely

Including dropdowns, prompts, and logic

Grid layout requirements

Layout must be:

Columns: Monday–Friday

Rows: Lap 1, Lap 2, Lap 3

Each cell:

Large, obvious add/edit button

Text stays inside container


Alignment & typography

Day headers (Mon–Fri):

Centered horizontally

“Lap 1 / Lap 2 / Lap 3”:

Larger font

Dates:

Larger font

Overall text size here should be increased across the board

Standards dropdown (content + UX)

Load North Carolina 7th Grade standards:

Full list to include:

NS1, NS2, NS3

EE1, EE2, EE3, EE4

RP1, RP2, RP3

G1, G2, G4, G5, G6

SP1, SP2, SP3, SP4, SP5, SP6, SP7, SP8

Each standard must include:

Abbreviated description next to the code

Not just the code alone

Remove unnecessary text

Remove footer text:

“Standards loaded…”

8. Seating Chart Builder (Clean-Up & Simplification)
Remove non-functional controls

Remove:

Ungroup

Rotate group ±15

Snap to grid toggle

Snap 40

Desk width / height controls

Apply size

Align bottom

Grid lines:

Keep

Set grid size permanently to 20

No toggle needed

Desk snapping behavior

Horizontal snapping works (desks touch)

Vertical snapping does not

Required:

Vertical stacking should allow desks to touch cleanly

Optional snap zone behavior is fine, but not required

Priority = predictable placement

Teacher desk

Teacher name must be:

Centered horizontally and vertically

If no students remain to assign:

Gray out add-student area

Show message like:

“All students assigned”

or “No students remaining”

9. Attendance / Monitor Mode (Critical)
Seating chart mismatch

Attendance view:

Uses seating data

But does NOT reposition interactive zones

Result:

Tap zones do not align with desks

Fix required:

Attendance visual and tap targets must match seating chart positions exactly

Attendance panel behavior

If attendance panel (list view) is used:

One row per student

Alphabetical by student name

Do not show seat numbers

Status buttons behavior

Panel buttons (Present / Absent / Tardy / Left Early):

Must apply same color coding as visual chart

Currently inconsistent

Remove “Hide Categories”

Remove hide categories option entirely

Attendance buttons must:

Always be visible

Always attached to seats

No toggling, no hiding

Responsiveness

Clicks feel delayed/sluggish

Investigate:

State batching

Debouncing

Re-renders

Improve perceived responsiveness

10. Final Navigation Cleanup

Eliminate confusing escape paths

Every page must make it obvious:

“Where am I?”

“How do I get back to monitoring?”

Logo + dashboard should handle this cleanly

No mystery buttons