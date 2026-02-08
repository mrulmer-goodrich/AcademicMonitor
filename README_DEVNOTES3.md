1. The underlying principle (this explains all your instincts)

You are designing for one dominant mode at a time.

Setup mode → calm, structured, text-light

Monitor mode → immersive, full-screen, no distractions

Dashboard → zero-scroll, immediate orientation

Right now, friction exists because the UI is behaving like a website, not a tool. Your feedback is about correcting that.

2. Global header (top bar) — decisive changes
Problem

Header is too tall

Beige background competes with content

Icon sizing and header height are coupled (they shouldn’t be)

Direction to developer

Decouple icon size from header height

Keep icon exactly as-is

Reduce vertical padding top/bottom of header by ~40–50%

Make the header transparent

Use a subtle glass effect:

backdrop-filter: blur(6–8px)

Very light translucent overlay if needed for contrast

Header should float over content, not consume space

Why:
This immediately restores vertical real estate and makes the product feel modern and intentional.

3. “Academic Monitoring” pill — make it a statement

You’re right: it’s visually receding when it should anchor identity.

Changes

Double the height of the pill container

Increase font size significantly (this should read before the headline)

Treat it visually the same way as “Today at a Glance”

Same weight

Same presence

Same confidence

Intent:
This is not metadata. This is what the product is. IT IS THE NAME OF THE PRODUCT!

4. Dashboard scroll — eliminate it completely
Rule

The dashboard must fit without scrolling on a standard laptop viewport.

Guidance

Reduce top padding above “Welcome back, Mr. UG”

Remove unnecessary subheaders

Tighten vertical rhythm between sections

Also:

Remove the period at the end of “Welcome back, Mr. UG”

Periods here feel scolding, not welcoming

5. Right-side buttons — simplify language, increase clarity

You nailed this. The headers + subheaders are redundant.

Replace with these exact labels

Setup / Manage Blocks
Setup / Manage Students
Setup / Manage Seating Chart
Name Your Laps
Reporting
Additional guidance

One line per item

Larger font to fill the existing container height

Make them feel like tools, not documentation

6. Monitor card → make it a live snapshot (this is a GREAT idea)

This is a true “it factor” move.

Behavior

The Monitor card shows:

A mini snapshot of:

Today’s first block or

The last block the teacher was in (if already active today)

If no activity today:

Show first block

Clicking anywhere on the snapshot:

Opens the full seating view immediately

Copy

Top: Monitor

Subtext: Jump into today’s seating view

Bottom-left CTA can remain, but the image itself should feel tappable

Why this works:
It collapses decision → action into one instinctive tap.

7. Student setup page — bubbles & labels (very specific, very right)
Changes

Increase student status circle icons by ~50%

Make text inside bold

Fix wrapping:

“ML New” must render fully

“IEP / 504”:

Add space after slash

Allow “504” to wrap to next line cleanly

Do not change column widths

Column headers

Center-justify headers for all columns (1–6)

Treat them as structural anchors, not labels

8. Setup → Labs page — typography consistency
Changes

Days of the week + date:

Centered in column

Slightly increased font size

“Lap 1 / Lap 2 / Lap 3” on the left:

Same font

Same size

Same styling as the Day of the Week text

Why:
These are parallel concepts (time structure). They should look related.

9. Setup pages — unify naming & remove dead weight

You caught a real inconsistency here.

Global rule

If the dashboard says:

“Set up / manage blocks”

Then the setup page header must say exactly that.

Changes

Remove tiny “Setup” label under page titles

Remove excessive top padding

Page header should read:

Set up / manage blocks

Set up / manage students

etc.

Remove all explanatory subtext (“Create, modify, archive…”)

Navigation buttons

Blocks / Students / Seating / Laps:

Same row as page title

Centered

Visually grouped

Treated like mode switches, not links

10. Monitor page — simplify to one dominant experience

This is the most important section.

Vision (clean and correct)
Structure

One primary container:

Full-width seating chart

Maximize screen usage (especially iPad)

Optional small control strip at top (if needed)

Attendance flow (simplified and intuitive)

Enter Monitor

If attendance not taken:

Overlay modal appears:

“Take attendance”

Seating chart view (same layout/size as monitoring view)

Inside modal:

Toggle:

Seat view / List view

Buttons:

Mark all present

Mark all absent

Clear save action (or explicit confirmation)

Save → modal closes

After attendance

Prompt:

“Name your laps for today”
The three laps named for the day for that block should populate and be editable.  
If not already named for that day for that block, then three empty containers that require text.

User confirms/saves.

Done

No extra panels. No ambiguity about saving.

During monitoring

Remove:

Student names

Attendance status labels

Dates

Instructional text (“Tap desk to…”)

Assume:

It’s today

The teacher knows what to do

They want space, not explanation

11. Final gut-check (this is the bar)

When a teacher opens Monitor on an iPad, it should feel like:

“This screen is mine right now. Nothing else matters.”

You are not building a dashboard.
You are building a teaching instrument.