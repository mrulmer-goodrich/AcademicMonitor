# Academic Monitor — Integrated Guidelines, Principles, Specifications

This document is the single source of truth for the initial build. It consolidates v0 and v1 requirements and the binding appendix decisions.

## Product Intent
- Professional, elegant educational SaaS focused on daily monitoring.
- Minimize clicks, touch-first, zero-lag UX.
- Data persists per teacher across devices and school years.
- Reports must be downloadable as CSV/XLSX.

## Non-Goals (Initial Build)
- AI-driven grouping or analytics.
- Multi-teacher shared classes, student/parent logins.
- District-wide aggregation.
- Native mobile apps or offline mode.
- Automatic device orientation detection (manual toggle only if needed).

## Core Terms
- Block: A class period. Unique per teacher per school year.
- Lap: One of three instructional segments in a day; must be named.
- SeatDisplay: Interactive monitoring screen where desks are tapped to record performance.
- SeatNumber: Monotonically increasing, never reused within a school year.

## Identity and Persistence
- Student has an immutable StudentUUID (internal only).
- Display Name can change; history must re-label.
- Conceptual anchor: SchoolYear + BlockNumber + SeatNumber.
- A student cannot be in more than one block at the same time.

## School Year Model
- All data scoped to SchoolYear.
- School years can be archived (read-only) and cloned into new years.

## Laps (Hard Gate)
- Exactly three laps per instructional day.
- Laps must be named before SeatDisplay unlocks.
- Lap name optionally references an NC standard code (RP.1 format).

## Attendance
- Attendance is required before SeatDisplay unlocks.
- Statuses: Present, Absent, Tardy, Left Early.
- Attendance changes must be timestamped.

## SeatDisplay Interaction
- Touch-first, no long press or double-click for primary actions.
- SeatDisplay is inactive until Block selected, attendance completed, and laps named.
- Selecting laps splits desks into equal vertical sections (Lap 1 left to Lap 3 right).
- Performance color cycle per lap: Green, Yellow, Red, then loop.
- Red label is “Nothing Written.”
- Absent students must be visually masked and non-interactive.

## Student Categories
Visible on desk with black-outlined circles:
- ML (light blue)
- ML New (light blue stripe)
- IEP/504 (pink)
- EC (yellow)
- CA (white)
- HIIT (purple)
- EOG (5 dark blue, 4 green, 3 orange, NP red)

## Setup Pages
- Blocks: add, modify, archive, delete (with safeguards).
- Students: add, edit, inactivate, import.
- Seating: drag/drop desks, snap grouping, rotate, uniform sizing, teacher desk.
- Laps: weekly grid (Mon-Fri) with three laps per day; copy from another block if empty.

## Monitor Page
- Minimal top bar with Block, Attendance, Lap1/2/3.
- Once laps named, single click toggles visibility; double click edits name (optional secondary).

## Reports
- Filters: laps, days, blocks, students, categories, standards.
- On-screen tables can be compact and horizontally scrollable with sticky name column.
- Exports must include fully labeled columns and date+lap identifiers.

## Design Principles
- Maximize visible data; reduce scrolling for standard monitor/iPad.
- Use optimistic UI for rapid taps.
- Keep the “global header” minimal (icon only), landing page has About/Contact in header.
