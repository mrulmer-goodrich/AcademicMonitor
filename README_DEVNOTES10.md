 Dashboard changes
1. Fix the block-column resizing
	•	The 3 block columns are resizing badly based on browser width.
	•	Keep the entire dashboard inside a constrained main container.
	•	Do not allow the block cards/tiles to grow excessively wide or tall when the browser gets larger.
	•	The 3 block areas should stay visually balanced and compact.
	•	Goal: reduce empty space and keep the current week data visible without unnecessary scrolling.
2. Reduce padding / vertical waste
	•	Reduce padding inside the attendance / lap / monitoring tiles.
	•	Reduce gaps between tiles.
	•	Reduce extra vertical spacing around headers and between sections.
	•	The dashboard should be compact enough that the weekly/current-week data section is visible on a normal full-screen laptop without forcing the user to scroll.
3. Remove redundant tile text
	•	Do not show both:
	◦	“Click here to complete”
	◦	“Open”
	•	Entire tile should be clickable.
	•	Use one subtle global cue near the top if needed, such as:
	◦	“All tiles are clickable”
	•	Tile contents should be compact and obvious without repeated action text.
4. Show status visually, not with bulky wording
	•	Each attendance / lap / monitoring tile should use a compact status design.
	•	Use icon + label + short status.
	•	Example status visuals:
	◦	green check = complete
	◦	yellow warning = incomplete / needs attention
	◦	gray = not started
	•	Keep tile height much smaller than current version.
5. Weekly stats / current week data cards
	•	The weekly stats / current week data cards should match the same size/style family as the status cards above.
	•	They should look like part of the same dashboard system.
	•	These weekly stats tiles should be clickable.
	•	Clicking a weekly stats tile should open a clean visual report showing the underlying data used to generate that chart/number.
6. Block title row
	•	Put Block 1 and Honors Math on the same line.
	•	Keep the subtitle styling smaller/lighter, but in the same row to reduce vertical space.
	•	Same for all blocks.

Seating chart page changes
7. Remove block dropdown if block is already determined by dashboard routing
	•	Since navigation now comes directly from the dashboard into the correct block-specific screen, remove the block dropdown from the seating chart page if possible.
	•	Goal: reduce clutter and reclaim horizontal space.
8. Move Return to Dashboard into same row
	•	Move Return to Dashboard onto the same top row as the rest of the controls if layout allows.
	•	Main reason: reduce vertical space at the top of the page.
9. Review autosave truthfulness
	•	The seating chart currently says autosave is enabled.
	•	Confirm this is actually true after the recent gatekeeping / save-flow changes.
	•	If autosave is no longer fully reliable, update the UI text so it does not claim something inaccurate.
10. Consider moving top-page utility buttons upward
	•	Explore moving the setup/report buttons higher into the top control row where possible.
	•	This is a cleanup / consolidation goal, but only if it improves layout without crowding.
	•	Do not force this if it makes the top row worse.

LAP naming page changes
11. Fix broken edit mode visual layering
Current issue:
	•	When clicking Edit, the original tile still appears behind the edit UI.
	•	The visual layering is confusing.
	•	The lap name field looks grayed out or blocked.
	•	It appears inactive even when editing.
	•	The standard selector is visually interfering with the lap name field.
Required fix:
	•	Edit mode should fully replace or clearly transform the display state.
	•	Do not leave the old “read-only” card looking like it is sitting behind the edit form.
	•	The lap name field must clearly look active and editable.
12. Restructure LAP edit layout
Recommended change:
	•	Put Lap Name on the first row.
	•	Put Standard on a second row underneath it.
	•	This avoids overlap and makes typing behavior visually obvious.
13. Preserve copy/paste workflow
	•	The LAP name input area still needs to support bulk copy/paste from an outside table/spreadsheet for the lap names.
	•	If the standards must remain manual dropdown selections, that is acceptable.
	•	In that case:
	◦	pasted content should populate lap names only
	◦	standards can be selected manually afterward
	•	Codex should prioritize clean, reliable paste behavior over trying to paste both lap names and standards together.  That is not an option that we want to explore.

Important design intent Codex should follow
	•	Clean up the dashboard without redesigning unrelated parts of the app.
	•	Make the dashboard feel tighter, clearer, and more obviously interactive.
	•	Remove wasted space.
	•	Keep everything visually contained.
	•	Prioritize showing the current week data on screen without scroll when possible.
	•	Since screens are block-specific now, remove unnecessary dropdowns/switchers where they are no longer needed.
Short version to hand Codex
	1	Fix dashboard grid/card resizing so columns do not balloon with browser width.
	2	Reduce padding and vertical space across dashboard so weekly stats are visible without scroll.
	3	Remove “Click here to complete” and “Open”; make whole tile clickable.
	4	Use compact icon-based status tiles for attendance/lap/monitoring.
	5	Make weekly stats cards match those tiles visually and be clickable to open detailed reports.
	6	Put Block X and class subtitle on one line.
	7	On seating chart, remove block dropdown if routing already determines block.
	8	Move Return to Dashboard into the top row if possible.
	9	Verify whether autosave is truly active; fix the label if not.
	10	Clean up LAP edit mode so the edit fields do not visually overlap the old tile.
	11	Put Lap Name on top row, Standard underneath.
	12	Preserve bulk paste for lap names; standards may be manual if needed.
