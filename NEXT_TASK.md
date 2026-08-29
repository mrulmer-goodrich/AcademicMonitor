# Next Task

## Active work

The recording-QA correction pass is implemented for live device review. It covers projected-screen privacy, student-management density and class tools, the complete weekly lap-planning model, and longitudinal attendance reports.

Review checklist:

- Confirm Add All places a full real roster without overlap and that legacy overlaps are highlighted clearly
- Confirm seating and monitoring preserve useful indicator colors/patterns without readable category letters or EOG values when projected
- Confirm student rows remain fixed when Edit and unsaved states appear, the Add Student dialog captures all setup together, and selected-student class changes work as expected
- Confirm the complete 5-day by 3-lap week remains visible and stable in both view and edit modes on the classroom laptop
- Confirm individual attendance visibly distinguishes Present from no record and navigates previous/future months
- Confirm Entire Class attendance switches cleanly among day, week, and month views
- Confirm Attendance List remains available with unseated students while seat-map attendance and monitoring remain guarded
- Confirm the Command Center refreshes immediately after Save & Return and reports the attendance status mix clearly
- Confirm the Command Center continues showing the current school day after midnight UTC but before midnight Eastern
- Confirm the seating editor and attendance/monitoring canvas use the available screen and show every row on the classroom device
- Archive the remaining 25/26 class, start 26/27, and create the new classes
- Confirm weekend attendance and performance entries behave as expected and remain absent from standard reports
- Review the new student cards, single-day lap planner, and individual-student monitoring report
- Decide whether the next pass should deepen reporting trends or focus on sales-facing copy and visuals

## Known follow-up opportunities

These are current product limitations, not committed work:

- Replace the stubbed password-reset route with a secure email flow
- Decide whether to expand or make the standards library configurable
- Decide whether a future rollover should optionally clone class names, students, or seating layouts
- Add automated tests for authentication, setup gates, performance capture, and report exports
- Add trend charts and multi-week comparisons to individual-student monitoring reports

## Blockers and questions

- Production work requires a valid PostgreSQL `DATABASE_URL`
- Optimized builds can pause silently for about a minute in this local environment; the August 29 production build completed successfully after the pause
