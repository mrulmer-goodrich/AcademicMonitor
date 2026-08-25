# Next Task

## Active work

The school-year rollover, archived-class organization, and classroom-canvas sizing pass is implemented for live device review.

Review checklist:

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
