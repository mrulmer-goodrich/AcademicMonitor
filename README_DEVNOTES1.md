NEW NOTES — Developer Change List (Academic Monitoring Web App)
A) Global Header / Logo Behavior

Logo size

Increase logo to ~2× current size.

Allow overflow if needed so it visually fills the header (currently looks ~1/3 of the intended presence).

Logo click routing

Current behavior: clicking logo sends user to public “Home/Landing” even when logged in.

New behavior:

If user is authenticated (dashboard or deeper pages): logo click → Dashboard

Only from the Dashboard should there be a clear way to go to the public Landing (e.g., “Home” link/button).

Goal: logo = “app home” (dashboard), not “public marketing home,” once logged in.

B) Dashboard (After Login)

Problem: Dashboard cards are “beige and boring” and feel like a dead-end.

Options (choose one coherent direction; do not keep current awkward extra step):

Improve visuals

Add a subtle dashboard background (gradient/texture/soft tone).

Increase card size / presence.

Add stronger hover states, depth, contrast.

Improve IA (preferred)

Instead of 3 generic cards that lead to another “choose setup task” page:

Put direct buttons on dashboard for:

Blocks

Students

Seating

Laps

Keep “Setup / Monitor / Report” if desired, but the user wants direct navigation without the extra intermediate chooser screen.

C) Copy / Microcopy Cleanup

Remove sentence-ending periods in card descriptions

Under Monitor: remove trailing period.

Under Report: remove trailing period.

User finds these periods visually awkward—remove across dashboard descriptions (and similar UI copy where it appears).

Logout is too easy

Add friction to logout (at minimum):

Confirmation modal (“Log out?”)

or move logout into a menu to avoid accidental taps.

D) Blocks Setup Page (Add/Edit Blocks)

“Add Block” button hover

Make hover/active state more prominent (clearer change on hover + click feedback).

Block number auto-advance

After adding Block 1, the number field resets back to 1.

New behavior:

After successful add, auto-increment block number to next integer (1 → 2 → 3 …).

Enter key submits

When cursor is in “Block Name” field and user presses Enter:

Trigger the “Add Block” action (same as clicking the button).

Leading zero in display

User sees a leading zero in the visual display (e.g., “01”).

Remove leading zeros unless there’s a deliberate formatting standard (default should be plain integer: “1, 2, 3…”).

Replace “Save” concept with explicit Edit flow

Current UI shows a “Save” button per row but it’s unclear why/when to use it.

Required UX:

Rows should be read-only by default.

Provide an Edit button.

On Edit:

Make block name editable (and/or number if allowed).

Replace Edit with Save (and optionally Cancel).

Make it obvious what changed and what is being saved.

E) Students Setup Page (Add/Edit Students)

Enter key adds student

When typing a student name, pressing Enter should perform Add Student.

Active/Inactive + Editing inconsistency

Current: you can toggle Active/Inactive but still edit name and save; feels inconsistent.

Required UX:

Rows should be read-only until Edit is clicked.

Active/Inactive behavior should be intentional:

Either toggling requires Edit mode, or toggling is allowed but name edits still require Edit mode.

“Save” must be intuitive and not look like a random extra step.

Save clarity

If saves are per-row, show clear indicators:

“Unsaved changes” state when something is modified

“Saved” confirmation or subtle toast after save

If the app allows navigating away without saving (currently seems allowed), that’s fine, but the UI must make it clear whether changes are saved automatically or not.

Import layout reversal

Reverse the two areas:

Import list should be on the right

The “paste student names” box should be smaller and on the right

Net: move/resize so the layout is visually cleaner and the big focus is the list, not the paste box.

F) Seating Chart Builder

Teacher desk name

When adding a Teacher Desk, it should automatically display the teacher’s name (your name) inside that desk box.

Remove seat number from desk tiles

Do not show seat number inside the desk tile in the seating chart view.

Student name sizing

Names are currently too small (~30% of width).

Make the name take most of the tile width and be the primary visual element.

Icon sizing

Enlarge the little icons on desk tiles: ~2× current size.

Bottom row not pinned

Seating chart bottom row is not truly fixed/aligned to the bottom as expected.

Fix layout so the grid aligns predictably and fills intended space.

“Desk shoots across the screen” bug

There is a weird interaction where a desk suddenly jumps across the screen.

Investigate drag/positioning logic:

accidental drag trigger?

pointer events + click-to-select conflict?

bad snap-to-grid or collision resolution?

Fix so objects move only when explicitly dragged.

Autosave clarity

Seating chart has no Save button; unclear if it autosaves.

Required:

Either add a Save/Autosave indicator, or show “Saved” toast after changes.

Make persistence behavior explicit.

G) Laps Setup UI (Mon–Fri Columns + Lap Rows)

Problem: The “add lap text” UI is tiny/vertical and looks broken.

Required layout:

Grid layout with 5 columns: Monday → Friday

One column for rows: Lap 1, Lap 2, Lap 3 (each its own row label)

In each cell:

A large, obvious button (e.g., plus icon) to add/edit text

The container must expand properly and keep text inside (no tiny “pill” that overflows or collapses)

H) Navigation / Getting “Stuck”

On certain pages, user cannot easily return to the right place.

Replace the current “Dashboard button top-right” behavior (user dislikes it) with a clearer navigation scheme:

Use a consistent top nav:

Dashboard

Setup

Monitor

Report

(Logout in menu)

Or at minimum:

Ensure there is always an obvious way back to Dashboard besides a tiny top-right button.

I) Monitor / Attendance Flow (Blocking Issues)

Attendance unlock messaging

User sees message like:

“Complete attendance and name laps to unlock the display”

If prerequisites are required:

Provide a direct button/link from that warning to the exact Setup page needed (e.g., “Go to Laps Setup”).

Seating chart mismatch

In Attendance view, the seats are not laid out according to the saved seating chart.

This is a core correctness issue:

Attendance must render seats in the same arrangement as the saved seating chart.

Tap cycles for attendance states

Current: one tap makes a student absent; additional taps don’t cycle status.

Required:

Tapping should cycle through states (define them, e.g.):

Present → Absent → Tardy → (maybe) Left Early → Present

Or at least Present ↔ Absent toggling reliably.

Simulated date test

User set simulated date to tomorrow; app still claims setup isn’t complete.

Investigate whether:

setup completion state is date-bound incorrectly

simulated date breaks gating logic

Fix gating logic so it reflects actual setup status.