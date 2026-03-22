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

In `MainPage.tsx`, `handleTableClick` currently sets `clickedTableId` and opens `BookingDrawer`. It will instead open `TableDrawer`, passing the clicked `table` as a prop. The `clickedTableId` state variable and the `initialTableId` prop on `BookingDrawer` are unchanged — the "New Reservation" button in `FilterBar` continues to open `BookingDrawer` exactly as before (with no pre-selected table).

`TableCell.tsx` currently blocks click events on `reserved` and `unavailable` tables. This guard is removed — all tables become clickable. Visual styles (greyed out for reserved, red tint for unavailable) are unchanged.

### Component: `TableDrawer.tsx`

Slide-in drawer from the right, same visual style as `BookingDrawer`. Props: `open: boolean`, `onClose: () => void`, `table: Table | undefined`.

The drawer has two stacked sections:

#### Section A — Upcoming Reservations

- On open, fetches `GET /api/reservations/table/{tableId}`. The backend already filters to `endsAt > now()`, so all returned reservations are current or future. No additional client-side time filter is applied.
- Displays a list of reservation rows sorted by `startsAt` ascending. Each row shows: guest name, party size, formatted date/time, and notes (truncated).
- Each row has two actions:
  - **Edit**: expands the row into an inline form with fields for guest name, party size, date, time, and notes. On save, calls `PUT /api/reservations/{id}`. On success, the list re-fetches and the global store is refreshed (see "Store refresh pattern" below). On failure (409 conflict or network error), an inline error message appears within the expanded row; the row stays open so the user can correct the input.
  - **Delete**: calls `DELETE /api/reservations/{id}` immediately — no confirmation dialog. On success, the list re-fetches and the global store is refreshed. On failure, an inline error message appears on the row.
  - Cancel on the edit form collapses the row back to read view without saving.
- If there are no upcoming reservations, shows a short empty-state message.

#### Section B — New Reservation

- Table is locked: displayed as a non-editable badge showing the table label and capacity.
- Fields: guest name (text), party size (number), date (date picker), time (time input), notes (textarea).
- Includes the `MealSuggestions` component (TheMealDB search), identical to how it appears in `BookingDrawer`.
- "Book" button calls `POST /api/reservations`. On success, Section A re-fetches and the global store is refreshed. On failure, shows an error message below the button (same pattern as `BookingDrawer`'s `bookingError` state).

#### Store refresh pattern

After any successful create/update/delete in this drawer, call:
```ts
const fresh = await reservationApi.getReservations({});
useLayoutStore.getState().setReservations(fresh);
```
This is the same pattern `BookingDrawer` already uses — no new helper is needed.

#### i18n

All visible strings in `TableDrawer` must use `react-i18next` translation keys, consistent with the rest of the app. The implementer is responsible for choosing key names and adding entries to both `en.json` and `et.json`. No hardcoded English strings in JSX.

### API change: `reservationApi.ts`

Add:
```ts
export interface UpdateReservationRequest {
  guestName: string;
  partySize: number;
  startsAt: string;   // ISO 8601
  notes?: string;
}

export async function updateReservation(id: number, req: UpdateReservationRequest): Promise<Reservation>
```
`tableIds` is intentionally omitted — table assignment is not editable. `durationHours` is also omitted; the backend always recomputes `endsAt = startsAt + 2.5h` on update (same as create default).

---

## Feature 2: Block Table Delete with Future Reservations

### AdminPage change

`AdminPage.tsx` loads reservations on mount via `reservationApi.getReservations({})` and stores them with `useLayoutStore.getState().setReservations(data)` — same pattern as `MainPage`. This ensures the store is populated even when the admin navigates directly to `/admin`.

**Known limitation:** The store snapshot may be stale if a reservation was created in another session after the page loaded. The guard is best-effort on the client side; no backend 409 is added for this path (the backend already cascades deletes on table removal via FK, so there is no data integrity risk — only a UX safeguard).

### LayoutBuilder change

`handleDeleteSelected()` currently calls `removeTable(id)` for each selected table with no checks. Before deletion, it checks the store's `reservations` for any entry where:
- `reservation.tableIds.includes(id)`, AND
- `reservation.startsAt > new Date().toISOString()`

If any match is found, deletion is blocked for those tables and an inline error banner appears (same style as the existing `overlapError` banner) listing the blocked table labels. Tables with only past reservations (or no reservations) delete freely.

---

## Backend: PUT /api/reservations/{id}

### New DTO: `UpdateReservationRequest`

```java
public record UpdateReservationRequest(
    @NotBlank String guestName,
    @Min(1) int partySize,
    @NotNull Instant startsAt,
    String notes
) {}
```

`durationHours` is not included; `endsAt` is always computed as `startsAt + 2.5h`.

### New repository method: `existsOverlapExcluding`

The existing `existsOverlap(tableId, startsAt, endsAt)` has no exclude parameter — calling it for an update would always self-conflict. Add a new query:

```java
@Query("""
    SELECT CASE WHEN COUNT(rt) > 0 THEN TRUE ELSE FALSE END
    FROM ReservationTable rt
    WHERE rt.table.id = :tableId
      AND rt.reservation.id <> :excludeId
      AND rt.reservation.startsAt < :endsAt
      AND rt.reservation.endsAt   > :startsAt
    """)
boolean existsOverlapExcluding(@Param("tableId") Long tableId,
                                @Param("startsAt") Instant startsAt,
                                @Param("endsAt") Instant endsAt,
                                @Param("excludeId") Long excludeId);
```

### Service method: `updateReservation`

`updateReservation(Long id, UpdateReservationRequest req)`:
- Loads existing reservation by ID or throws 404.
- Computes `endsAt = req.startsAt() + 2.5h`.
- For each `tableId` in the existing reservation's tables, calls `existsOverlapExcluding(tableId, startsAt, endsAt, id)`. Collects conflicts; if any, throws 409 `ConflictException` with the conflicting table labels.
- Updates fields: `guestName`, `partySize`, `startsAt`, `endsAt`, `notes`.
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
| `frontend/src/pages/MainPage.tsx` | Wire table click to TableDrawer; keep BookingDrawer for filter bar |
| `frontend/src/api/reservationApi.ts` | Add `updateReservation` + `UpdateReservationRequest` |
| `frontend/src/pages/AdminPage.tsx` | Load reservations on mount |
| `frontend/src/components/admin/LayoutBuilder.tsx` | Future-reservation guard before delete |
| `frontend/public/locales/en/translation.json` | Add TableDrawer string keys |
| `frontend/public/locales/et/translation.json` | Add TableDrawer string keys (ET) |
| `backend/.../reservation/ReservationController.java` | Add PUT endpoint |
| `backend/.../reservation/ReservationService.java` | Add `updateReservation` method |
| `backend/.../reservation/dto/UpdateReservationRequest.java` | **New** DTO |
| `backend/.../reservation/repositories/ReservationRepository.java` | Add `existsOverlapExcluding` query |

---

## Out of Scope

- Changing which tables a reservation is assigned to (edit form does not include table selection).
- Pagination of the reservation list (expected to be short for a single table).
- Confirmation dialogs for deletion.
- `durationHours` editing (always recalculates as 2.5h on update).
- Backend-enforced delete guard for table removal (client-side best-effort check only).
