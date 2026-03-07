Academic Monitoring WebsiteChange Summary for Codex
Purpose: Implement only the changes described below. Preserve all existing design, flows, styling, and architecture unless a change is explicitly listed here.


1) Global Header / Navigation Changes
Remove Monitor, Report, and Dashboard buttons from the global header.
These global header removals apply everywhere.
On setup-style pages, also remove secondary header items and account/navigation clutter such as About, Contact, Account, and similar utility links when those pages already have a dashboard-return path.
2) Main Dashboard Redesign
Dashboard should prominently display header text reading exactly: "Today's Dashboard".
Remove the sentence/intro text currently shown on the dashboard screen.
Replace the current large touchscreen-style central area with individually clickable dashboard tiles/cards.
Each dashboard tile should route directly to its corresponding destination screen.
Weekly stats should remain visible on the dashboard, positioned as a lower dashboard section.
To the left of the dashboard should be two setup buttons: Name Your Laps and Seating Chart.
To the right of the Dashboard are two setup buttons: update BLOCKS and update STUDENTS
Include a button from the dashboard to Reports.
3) Dashboard Clickable Status Tiles
All dashboard status buttons/tiles are clickable.
Attendance tile behavior: tile lapel/state should reflect one of the following — Click here to complete, Incomplete, or Complete.
Any attendance tile should route to the same attendance/monitoring screen, already filtered for that exact block and the relevant attendance record for today.
LAP status tile behavior: show Incomplete or Complete depending on whether LAP naming/setup has been fully finished for today.
Monitoring status tile behavior: show Incomplete or Complete based on collected monitoring data.
Monitoring should be considered Complete when, for each LAP, at least one student has some monitoring data recorded. It does NOT require all students to be scored.
Example rule: if 30 students are present and each LAP has at least one recorded student status, monitoring can count as complete even if many students remain unscored.
4) Name Laps Screen Redesign
Remove the current setup tabs/buttons and extra setup navigation from this screen.
Add one large Return to Dashboard button.
The page should mainly show the lap naming grid/interface.
Editing should be batch-edit, not one-field-at-a-time.
When the user clicks Edit, all editable lap-name fields should become editable at once.
After editing, the user should click Save once to save all edited fields together.
Support bulk paste from Google Sheets or Excel directly into the Name Laps grid.
Pasted tabular data should map automatically into the correct boxes/cells in the grid (example given: 5 columns x 3 rows).
5) Blocks / Students / Seating Chart Setup Screens
For Blocks, Students, Seating Chart, and Name Laps setup pages: remove the four setup buttons/tabs that currently appear across the top/inside the setup area.
Remove unnecessary titles when the page content is already self-explanatory.
Add one large Return to Dashboard button on each of these pages.
Within these setup pages, remove other nonessential nav/account links because the user wants these pages to feel focused and simple.
6) Monitoring Screen Workflow Changes
Do not auto-save monitoring/attendance changes.
Do not auto-complete the workflow when the final student row is reached.
The current issue: when the last student is absent, the screen behavior forces awkward correction/rework. That should be eliminated.
Implement an explicit save/finish flow instead of implicit completion at the last student.
Recommended implementation assumption: add a Save button and/or Save & Return to Dashboard button so the user controls when the record is finalized.
Remove the block-switching dropdown from the monitoring screen.
The user will access one block at a time from the dashboard, so the monitoring screen should already know the block context and should not require switching blocks there.
Add the same Return to Dashboard pattern at the top of the monitoring screen, consistent with the other redesigned screens.
7) Weekly Stats Logic on Dashboard
Weekly stats must represent the current school week only: Monday through Friday of the current week.
This is not a rolling 7-day window and not a trailing 5-day logic.
If today is Monday, stats show Monday only. If today is Tuesday, stats show Monday + Tuesday. Continue accumulating through Friday.
For each block, show a quick weekly stats summary.
The main count shown should be the total number of actual collected data points, not theoretical maximums and not nulls.
Only count students/LAPs that actually have data entered. Null/missing/uncollected entries should be excluded from the denominator.
Include a visual breakdown of green / yellow / red results.
The visual should be dynamically proportionate to real percentages (not equal thirds).
A pie chart or another clean graph is acceptable as long as it reflects the actual proportions clearly.
8) Optional Account / Admin Enhancements Requested
Account email correction: add a user-facing way for a logged-in user to correct or change the email address/ login name associated with their login/account.
This should be treated as an account settings feature, not a manual backend-only fix.
Admin visibility request: determine what admin-level reporting/inspection can be exposed about users and usage, based on current stored data.
9) RESERVED
10) Non-Negotiable Guardrails for Codex
Do not change anything that is not explicitly requested in this document.
Preserve current design language, styling direction, data model, and routing patterns unless modification is required to implement the changes above.
Prefer surgical edits over broad refactors.
Keep all existing working flows intact outside the affected pages/components.
Where the user said a title may be removable, keep implementation minimal and clean; do not add decorative content.
11) Assumptions Used to Eliminate Ambiguity
Return to Dashboard should be a large, visually obvious action on all setup/monitoring pages mentioned.
The dashboard is the primary hub; users should enter block-specific workflows from there instead of switching context inside child screens.
For the monitoring/attendance screen, explicit save/finalize behavior is preferred over current automatic completion behavior.
For weekly stats, all percentages and totals should derive only from actual recorded values for the current week.
12) Codex Implementation Intent (Plain English)
Make the dashboard the central command screen for the day.
Simplify all setup screens so they are focused, nearly distraction-free, and easy to exit back to the dashboard.
Remove global navigation that is now redundant.
Make monitoring block-specific, dashboard-driven, and explicitly saved.
Make weekly stats reflect only the current week and only real collected data.
Add account login name/email editing 