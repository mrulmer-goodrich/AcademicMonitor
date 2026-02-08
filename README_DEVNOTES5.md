Contact page: 
Remove the text:
“Click the button below to send us an email. Your mail app will open with a pre-filled message.
Email goes to: mug4631@gmail.com”

All of the following fields/buttons should be sized to be on the same row within the overall container.
<div class="flex flex-wrap items-center gap-3"><select class="form-control max-w-[260px]"><option value="cmlea6zpy0001ib04gj533m6v">Block 1 · Honors Math</option><option value="cmlea73nb0003ib04d6ac4h2f">Block 2 · Standard Math EC</option><option value="cmlea7auj0005ib04nnqcaala">Block 3 · Standard Math ML</option></select><input class="form-control w-[240px]" placeholder="Student name" value=""><button class="btn btn-primary" type="button">Add Student</button><button class="btn btn-ghost" type="button">Import List</button></div>

Setup Blocks page: The part that has this:
“Set up / manage blocks
Create, modify, archive, or delete blocks for the current school year.”

The Setup / Manage blocks text is not IDENTICAL to other text with same letters.  And the other subtitle needs to be removed.
(The comment is the same for each of the blocks/students/seating/laps.)

Student names are NOT being justified centered in the desk.  It should ALWAYS be like that.

On the seating chart setup page: change text of buttons to remove the word Rotate.  And for Delete Desk button, change to Delete.  I want all of those buttons to fit naturally on that “row”.

On the Naming Laps page, I would love for the sizes of the 15 text fields to be more fixed in size and let any long text wrap and reduce in font size to stay within the boundaries (with minimal padding).

Monitor page:
The Attendance Panel doesn’t open (I see it flicker a little sometimes).
Attendance: Complete · Tap desks to log lap performance - remove this text
Monitor unlocks after attendance is taken and three laps are named. Select at least one lap to begin.+ Lap — remove this text and button (there’s already a +lap button at the top)
As you can see with the screenshot, the alignment of the touchtone and the visuals of the seating chart are out of whack.  (They did improve!)
Remove Date: 02/02/2026
Instead of all the current stuff above the monitor, make an Attendance Button and  three boxes that show the data saved from the NameLap screen.  
	If attendance has not been taken for the block/day for all possible students, user is “forced” to take attendance.   When Attendance is clicked it opens the attendance click zone field.
Remove the “Monitor” and “Monitor” titles on the page.

So with all these comments about the Monitor page, it could just be:
The seating Chart with no “circles/categories” and it should have a full screen overlay that says Take Attendance (if not yet complete).  Any screen tap removes this overlay and can tap student desk to take attendance. There would be some small flag boxes Set All Present, Set All Absent, and Switch to Attendance List. If switch to attendance list, there is the overlay of students alphabetized.  When all students have been marked, there is a big overlay that says “Attendance Complete”.  If laps have been named, the attendance chart switches to the lap tracker.  If laps have not been named, the lap tracker is shown (with all the indicators) but visibly disabled with the boxes for the Lap Names highlighted - so user knows what to do next.  Once all laps have been named, Lap selector is available for data collection. There remains 5 items in a row across the top - Block Selector, Update Attendance, and one for each of the named laps.  Tapping the attendance button would toggle between  the attendance tracker and the lap tracker.  Tapping one of the lap buttons enables the desk to be “editable”.  Tapping a second lap would split the desk in half for clicking and collecting data.  Tapping the third one would split the desk to thirds.  That’s it.  {keep the simulate date for now}.
