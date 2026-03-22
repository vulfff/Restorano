# Table Reservation Management — Design Spec

**Date:** 2026-03-22
**Status:** Approved

## Overview

Two related features:
1. Clicking a table on the floor plan opens a new `TableDrawer` — a slide-in panel showing upcoming reservations (editable/deletable) and a direct new-reservation form with the table pre-selected.
2. Deleting a table in the Layout Builder is blocked if that table has any future reservations.

---

## Feature 1: TableDrawer

### Trigger

In `MainPage.tsx`, `handleTableClick` currently opens `BookingDrawer`. It will instead open `TableDrawer`, passing the clicked `table` as a prop. The existing `BookingDrawer` remains unchanged and continues to open via the "New Reservation" button in `FilterBar`.

`TableCell.tsx` currently blocks click events on `reserved` and `unavailable` tables. This guard is removed — all tables become clickable. Visual styles (greyed out for reserved, red tint for unavailable) are unchanged.

### Component: `TableDrawer.tsx`

Slide-in drawer from the right, same visual style as `BookingDrawer`. Receives `open: boolean`, `onClose: () => void`, `table: Table | undefined`.

The drawer has two stacked sections:

#### Section A — Upcoming Reservations

- On open, fetches `GET /api/reservations/table/{tableId}`, then filters client-side to entries where `startsAt > new Date().toISOString()`.
- Displays a list of reservation rows. Each row shows: guest name, party size, formatted date/time, and notes (truncated).
- Each row has two actions:
  - **Edit**: expands the row into an inline form with fields for guest name, party size, date, time, and notes. Save calls `PUT /api/reservations/{id}`. Cancel collapses back to read view. On save success, the list re-fetches and the global reservations store is refreshed via `reservationApi.getReservations({})`.
  - **Delete**: calls `DELETE /api/reservations/{id}` immediately — no confirmation dialog. On success, the list re-fetches and the global store is refreshed.
- If there are no upcoming reservations, shows a short empty-state message.

#### Section B — New Reservation

- Table is locked: displayed as a non-editable badge showing the table label and capacity.
- Fields: guest name (text), party size (number), date (date picker), time (time input), notes (textarea).
- Includes the `MealSuggestions` component (TheMealDB search), identical to how it appears in `BookingDrawer`.
- "Book" button calls `POST /api/reservations`. On success, Section A re-fetches and the global store is refreshed.

### API change: `reservationApi.ts`

Add:
```ts
export async function updateReservation(id: number, req: UpdateReservationRequest): Promise<Reservation>
```
Where `UpdateReservationRequest` mirrors `CreateReservationRequest` minus `tableIds` (tables are not changed in an edit).

---

## Feature 2: Block Table Delete with Future Reservations

### AdminPage change

`AdminPage.tsx` loads reservations on mount via `reservationApi.getReservations({})` and stores them in the layout store (same pattern as `MainPage`). This ensures the store is populated even when the admin navigates directly to `/admin`.

### LayoutBuilder change

`handleDeleteSelected()` currently calls `removeTable(id)` for each selected table with no checks. Before deletion, it checks the store's `reservations` for any entry where:
- `reservation.tableIds.includes(id)`, AND
- `reservation.startsAt > new Date().toISOString()`

If any match is found, deletion is blocked for those tables and an inline error banner appears (same style as the existing `overlapError` banner) listing the blocked table labels. Tables with only past reservations delete freely.

---

## Backend: PUT /api/reservations/{id}

### DTO: `UpdateReservationRequest`

```java
public record UpdateReservationRequest(
    @NotBlank String guestName,
    @Min(1) int partySize,
    @NotNull Instant startsAt,
    String notes
) {}
```

### Service method

`updateReservation(Long id, UpdateReservationRequest req)`:
- Loads existing reservation or throws 404.
- Computes new `endsAt = startsAt + 2.5h`.
- Runs the same overlap check as `createReservation`, excluding the current reservation ID.
- Saves and returns `ReservationDto`.

### Controller

```java
@PutMapping("/{id}")
@PreAuthorize("hasRole('ADMIN')")
public ReservationDto updateReservation(@PathVariable Long id,
                                        @RequestBody @Valid UpdateReservationRequest req) {
    return reservationService.updateReservation(id, req);
}
```

---

## Files Changed / Created

| File | Change |
|------|--------|
| `frontend/src/components/reservation/TableDrawer.tsx` | **New** |
| `frontend/src/components/floorplan/TableCell.tsx` | Remove click guard for reserved/unavailable |
| `frontend/src/pages/MainPage.tsx` | Wire table click to TableDrawer |
| `frontend/src/api/reservationApi.ts` | Add `updateReservation` |
| `frontend/src/pages/AdminPage.tsx` | Load reservations on mount |
| `frontend/src/components/admin/LayoutBuilder.tsx` | Future-reservation guard before delete |
| `backend/.../reservation/ReservationController.java` | Add PUT endpoint |
| `backend/.../reservation/ReservationService.java` | Add update method |
| `backend/.../reservation/dto/UpdateReservationRequest.java` | New DTO |

---

## Out of Scope

- Changing which tables a reservation is assigned to (edit form does not include table selection).
- Pagination of the reservation list (expected to be short for a single table).
- Confirmation dialogs for deletion.
