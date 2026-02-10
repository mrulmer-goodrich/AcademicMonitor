Import list button opens up a box that has text.  Update the text so that it is just enter names, one per line - and make sure you selected the correct block before importing.  That way they get assigned to that block.  (I did this earlier today and it worked great).

Setup/Manage Students Section
-As names are added to the list, it should auto-resort alpha by name. (Currently it looks like it is sorted on Seat #)
-Would like the ability to click in the "header" and sort the different fields (Name, EOG, and each of the six categories!).
-Need a way that the Inactive Students get "hidden".  And a way to delete students - after like 4 confirms that the data is going to be deleted and non-recoverable and should think about inactivating instead - that kind of thing.
-Need the ability to capture "notes" about the student.  The full text does not need to be on screen but there should be some indicator that there is a saved note.
-There remains (after multiple attempts to fix) an issue with the container with the Block Name, Blank Student Name field, Add Student, and Import buttons.  We forced the line to not wrap at some point, but that was because those four items have enough horizontal space to fit on one screen.  But items are getting resized to take up too much space and it pushes the items off screen to the right.

Attendance Section
-The "overlay" that says to take attendance - I want the text to fill up 50% of viewport to say "Take Attendance".  And I want it in an overlay that looks like an overlay so user knows to click to continue (it is not currently intuitive)
-A Student who has not been assigned a seat will prevent attendance from being completed - but there is no indication of the cause. Can we put a gate so before attendance can even be taken, the system checks to see if all active students have been assigned seats.  If they have not, a message is displayed to update Seating Chart first.
-The last student who has their attendance taken has to be Present.  If not, the attendance screen auto-closes when the last student has their first click.  Not sure how to fix this.  Give it a 2 second delay or something?  So user has time to click a second time for absent?
-The Attendance List overlay is not scrollable.  It is a fixed width container that has a very large vertical height that goes off viewport.
-Once attendance is complete and you click back into attendance, the way out is to "toggle" back but that is not intuitive. Solution: can we have the button say "Update Attendance") (wrapped in current size container - no changing container size).  And when you click it, behavior stays the same except the text of the button changes to "Back to Laps".  This will make it obvious.

Monitor Page
-Put the three lap toggle switches inside another container (like Attendance and List are).  Then add text inside this container that says "Select Laps to Monitor".  That will give more clear indication of next action.

Name Your Laps Page
-Day of week and date are currently left justified in column header.  They should be center justified.
-Increase font size in the lap boxes.

Global Header/TopBar
-Due to the background image and the opacity of the header, it appears visually to be a solid color.  Can we make the bar fully transparent?  And maybe the buttons on the right side of the bar get put into pill shaped containers so they "hover" better.

Global Issue:
-Glitchiness.  There is a lag between click and action sometimes. And when pages load, there is a "ghost" image of the page mid-loading.







