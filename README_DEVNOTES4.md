Change to Global header/topbar causes problem because the spacing for components on all pages is not taking into account the size of this header.

Upon initial start, everything is disabled except for blocks.  When at least one block is saved, then Students opens up (everything else stays disabled).  Once a Student is saved a seating chart must be created and then laps named.  Each one should guide you through the process of what to setup.

Remove text “Import or edit students. Each student has a seat number that never gets reused within a school year.”

Shorten Student name field slightly so that the Import button can be moved and sit next to the add button.

I don’t need to see “Seat Number” anywhere.  Let’s think of it as a hidden key value. Remove visual reference to it in all possible locations.

Remove text: “Drag desks to arrange the room. Desks snap together when close and can move as grouped clusters.”

Change text of Button from “Add Student Desk” to “Add” 

Update sizes of buttons so that Rotate, Delete, are on same line as others.  

Remove auto-fit option.

Current visual border of grid does not align to where the desks can be dropped.   And at the current visual size, it needs to be 

Update desk size.  Based only on visuals (you can convert to other, as needed).  Reduce vertical height by 8px. Reduce width of desk by 4px.

Update desks so that they can be “snapped” together (visually only is fine) when stacked.

Remove SETUP in global header/toolbar.  There is no need for that or the associated intermediate landing page.

The font from the below element is too small and does not match to the font from the Day of the Week.
<td class="font-semibold text-[15px] text-center">Lap <!-- -->1</td>

The text is not centered within the boundaries of that column.

See screenshot.  I was only able to take attendance through the panel, not by tapping the seats. When I did take attendance in the panel, the seat color changed immediately.  And there was no intuitive way to “finish” taking attendance through the panel.  Make attendance for all students required and as soon as last student has an attendance marker, the actual monitor opens and allows tracking data (the whole point of the app!!).  Also, the screenshot shows faintly in the background, that there is still a major mismatch between the desk and all the parts of that desk (the circles, click zone, etc).

Instead of Name laps in Setup first. Message, put a button for  “+ Lap” that navigates to the weekly Name Your Lap page.  And when saved, should return user back to SeatDisplay Page - which really should be referenced as Monitor (Not seat display).
