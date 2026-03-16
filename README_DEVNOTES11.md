In the Command Center, there seems to be obnly two indicators - a red tile with an arrow and a green tile with a checkmark.  If some data has been completed for that item, there should be a yellow tile with an exclamtion mark.  This was supposed to already exist.  If so, it does not work as intended.  For the first time today, I see it with the attendance records but not with the laps or the monitoring.
When done with attendance, the user gets three options.  Return to attendance works.  And the other buttons work to save the record (I believe) but it does not take to monitoring or to the dashboard - it just returns to the completed and saved attendance.  Let's just change to two options: 1) return to attendance without saving or 2) save attendance and routes directly to Command Center.
When attendance is complete. I want the total students notated in the tile (21/24 students) - that type of thing.  In order to do this, you are not allowed to change the size of the tile or the look/feel of the current tiles.
I hate the Reports page.  It does not work as I imagined.  I want to completely redesign this.  Changing this may change how the link to this page works when a user clicks on the donut diagram on Command Center.  This will need to be noted as we redesign the page.  Below is how I currently imagine it working (If I am not specifying something, I probably don't want it - like all your extra titles and subtitles):

*1* Upon clicking the Other Reports, land on Reports page for that Block.  Header shows: "REPORTS FOR BLOCK # / NAME". This is big and bold and cengtered on the page.
*2* User has two large option tiles: "Attendance Reports" and "Monitoring Reports"
*3* For Attendance Reports - I should have the ability to either select entire class or individual student (Preferably from a drop down or a "search for first name" function)
*4* When a student is chosen, there should be a calendar grid showing current month.  Below are some more details.  In addition to below, I should be able to export to XLSX a report for that student that includes name, date, attendance status (for all days that are recorded).



Build 7-column calendar grid.
Render circular day markers.
Use red fill for absences.
Use yellow fill for tardy
Use Orange fill for Left Early.
Do not use any fill for days attendance is not taken or when it is tken and student is present.
#### BELOW ARE INSTRUCTIONS FROM AN AI THAT SAW THE PICTURE OF WHAT I WANT###
5. Calendar Container

Centered rectangular container showing monthly attendance.

Width: ~360px
Padding: 16px
Border: 1px solid #ddd
Border-radius: 8px
Background: #ffffff

Inside container:

CalendarHeader
DayOfWeekRow
CalendarGrid
6. Calendar Header

Top row:

Left: Month Name
Right: "Today"

Example:

December 2025          Today

Styling:

Display: flex
Justify-content: space-between
Font-size: 14px
Color: #666
Margin-bottom: 10px
Row containing:

SU MO TU WE TH FR SA

Formatting:

Display: grid
Grid-template-columns: repeat(7, 1fr)
Text-align: center
Font-size: 12px
Color: #777
Margin-bottom: 8px
8. Month Label

Above the grid show the visible month:

Example:

January 2026

Styling:

Font-size: 14px
Font-weight: 600
Margin-bottom: 8px
9. Calendar Grid

Create a 7-column grid.

Display: grid
Grid-template-columns: repeat(7, 1fr)
Row-gap: 8px
Column-gap: 6px

Each cell contains a day number inside a circular badge.

Base style:

Width: 32px
Height: 32px
Border-radius: 50%
Display: flex
Align-items: center
Justify-content: center
Font-size: 13px
Margin: auto
10. Attendance Status Colors

Apply specific circle styles depending on attendance status.

Present (default)
No circle
Plain number
Color: #444

Additional colored circles should match to attendance status and color scheme in the repo.
11. Calendar Alignment Rules

Ensure:

First day aligns with correct weekday column
Blank cells inserted before first day
Total rows: 5–6 depending on month
#### ABOVE ARE INSTRUCTIONS FROM AN AI THAT SAW THE PICTURE OF WHAT I WANT###
*5* When an entire class is selected, I should have some calendar to pick a specific date and then the actual seating chart with attendance records for that day display (in read-only mode).  There should be a way to download to XLSX the student name, date, attendance status, and the total count of each attenadance status for that day.
*6* When Monitoring Reports is selected, again choice should be student or entire class. (this is identical to attenance reports).



*7* When an individual student is selected - HOLD FOR MORE INFO. DO NOT DEVELOP YET.- show as "coming soon"
*8* When an entire class is selected, the monitoring status should display (in read-only mode) - and i should be able to pick which lap(s) - in the same manner that it works now while monitoring.  There should be a downloadable XLSX option that provides the data selected/displayed on screen with columns for Name, Lap #, Lap Name, NC Standard (blank if none was ever selected), Color, 
I should be able to SCROLL through the days visually and be able to download each day (because that's what would currently be on the screen).