# Table Reservation Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow staff to view, edit, and delete a table's upcoming reservations by clicking it on the floor plan; also block deleting tables that have future reservations in the Layout Builder.

**Architecture:** Backend gains a `PUT /api/reservations/{id}` endpoint backed by a new `existsOverlapExcluding` repository query that avoids self-conflict during updates. Frontend gets a new `TableDrawer` component (slide-in drawer with an upcoming-reservation list + inline edit + new booking form) wired to all table clicks; `LayoutBuilder` gets a client-side guard that blocks deletion when the store has future reservations for a table.

**Tech Stack:** Java 21 / Spring Boot 3 / JPA (JPQL) / JUnit 5 + Mockito; React 18 / TypeScript / Zustand / Axios / react-i18next / Tailwind CSS v4

---

## File Map

| File | Role |
|------|------|
| `backend/.../reservation/repositories/ReservationRepository.java` | Add `existsOverlapExcluding` JPQL query |
| `backend/.../reservation/dto/UpdateReservationRequest.java` | New record: guest name, party size, startsAt, notes |
| `backend/.../reservation/ReservationService.java` | Add `updateReservation` method |
| `backend/.../reservation/ReservationController.java` | Add `PUT /{id}` endpoint |
| `backend/src/test/.../reservation/ReservationServiceTest.java` | Add 3 new tests for `updateReservation` |
| `frontend/src/api/reservationApi.ts` | Add `UpdateReservationRequest` type + `updateReservation()` |
| `frontend/src/components/floorplan/TableCell.tsx` | Remove click guard on reserved/unavailable |
| `frontend/public/locales/en/translation.json` | Add `tableDrawer.*` and `builder.errorDeleteBlocked` keys |
| `frontend/public/locales/et/translation.json` | Same keys in Estonian |
| `frontend/src/components/reservation/TableDrawer.tsx` | New drawer: reservation list + inline edit + new booking form |
| `frontend/src/pages/MainPage.tsx` | Wire table click → `TableDrawer` |
| `frontend/src/pages/AdminPage.tsx` | Load reservations on mount |
| `frontend/src/components/admin/LayoutBuilder.tsx` | Guard `handleDeleteSelected` against future reservations |

---

## Task 1: Add `existsOverlapExcluding` to ReservationRepository

**Files:**
- Modify: `backend/src/main/java/com/restorano/backend/reservation/repositories/ReservationRepository.java`

The existing `existsOverlap` has no exclude-ID param, so calling it during an update would always self-conflict. We need a variant that skips the reservation being updated.

- [ ] **Step 1: Add the query method**

Open `ReservationRepository.java` and add after the existing `existsOverlap` method:

```java
@Query("""
    SELECT CASE WHEN COUNT(r) > 0 THEN true ELSE false END
    FROM Reservation r JOIN r.tables t
    WHERE t.id = :tableId
      AND r.id <> :excludeId
      AND r.startsAt < :endsAt
      AND r.endsAt   > :startsAt
    """)
boolean existsOverlapExcluding(@Param("tableId") Long tableId,
                                @Param("startsAt") Instant startsAt,
                                @Param("endsAt") Instant endsAt,
                                @Param("excludeId") Long excludeId);
```

- [ ] **Step 2: Verify the project still compiles**

```bash
cd /c/Users/vulf/Restorano/backend && ./mvnw compile -q
```
Expected: BUILD SUCCESS with no errors.

---

## Task 2: Add `UpdateReservationRequest` DTO

**Files:**
- Create: `backend/src/main/java/com/restorano/backend/reservation/dto/UpdateReservationRequest.java`

- [ ] **Step 1: Create the DTO record**

```java
package com.restorano.backend.reservation.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;

public record UpdateReservationRequest(
    @NotBlank String guestName,
    @Min(1) int partySize,
    @NotNull Instant startsAt,
    String notes
) {}
```

- [ ] **Step 2: Compile to confirm no issues**

```bash
cd /c/Users/vulf/Restorano/backend && ./mvnw compile -q
```
Expected: BUILD SUCCESS.

---

## Task 3: Add `updateReservation` to ReservationService (TDD)

**Files:**
- Modify: `backend/src/test/java/com/restorano/backend/reservation/ReservationServiceTest.java`
- Modify: `backend/src/main/java/com/restorano/backend/reservation/ReservationService.java`

- [ ] **Step 1: Write three failing tests**

Add these tests to `ReservationServiceTest.java`. First, add the import at the top of the class:
```java
import com.restorano.backend.reservation.dto.UpdateReservationRequest;
```

Add a helper and the three tests:

```java
private UpdateReservationRequest updateReq() {
    return new UpdateReservationRequest("Bob", 3, STARTS_AT, "window seat");
}

private Reservation existingReservation(long id, RestaurantTable... tables) {
    Reservation r = new Reservation();
    r.setId(id);
    r.setGuestName("Alice");
    r.setPartySize(2);
    r.setStartsAt(STARTS_AT);
    r.setEndsAt(ENDS_AT);
    r.setNotes(null);
    r.setTables(new java.util.ArrayList<>(java.util.Arrays.asList(tables)));
    return r;
}

@Test
void updates_reservation_when_no_overlap() {
    RestaurantTable t = table(1L, "T1");
    Reservation existing = existingReservation(10L, t);
    when(reservationRepository.findById(10L)).thenReturn(Optional.of(existing));
    when(reservationRepository.existsOverlapExcluding(eq(1L), eq(STARTS_AT), eq(ENDS_AT), eq(10L)))
        .thenReturn(false);
    when(reservationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    ReservationDto dto = service.updateReservation(10L, updateReq());

    assertThat(dto.guestName()).isEqualTo("Bob");
    assertThat(dto.partySize()).isEqualTo(3);
    assertThat(dto.notes()).isEqualTo("window seat");
    verify(reservationRepository).save(existing);
}

@Test
void throws_ConflictException_on_update_when_time_overlaps_another_reservation() {
    RestaurantTable t = table(1L, "T1");
    Reservation existing = existingReservation(10L, t);
    when(reservationRepository.findById(10L)).thenReturn(Optional.of(existing));
    when(reservationRepository.existsOverlapExcluding(eq(1L), eq(STARTS_AT), eq(ENDS_AT), eq(10L)))
        .thenReturn(true);

    assertThatThrownBy(() -> service.updateReservation(10L, updateReq()))
        .isInstanceOf(ConflictException.class);
    verify(reservationRepository, never()).save(any());
}

@Test
void throws_NotFoundException_on_update_when_reservation_does_not_exist() {
    when(reservationRepository.findById(99L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.updateReservation(99L, updateReq()))
        .isInstanceOf(NotFoundException.class);
    verify(reservationRepository, never()).save(any());
}
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /c/Users/vulf/Restorano/backend && ./mvnw test -pl . -Dtest=ReservationServiceTest -q 2>&1 | tail -20
```
Expected: 3 failures — `updateReservation` method does not exist yet.

- [ ] **Step 3: Implement `updateReservation` in ReservationService**

Add to `ReservationService.java` (after `deleteReservation`). Also add the import:
```java
import com.restorano.backend.reservation.dto.UpdateReservationRequest;
```

Method:
```java
@Transactional
public ReservationDto updateReservation(Long id, UpdateReservationRequest req) {
    Reservation reservation = reservationRepository.findById(id)
        .orElseThrow(() -> new NotFoundException("Reservation not found: " + id));

    Instant endsAt = req.startsAt().plusSeconds((long) (2.5 * 3600));

    List<String> conflicts = new ArrayList<>();
    for (RestaurantTable table : reservation.getTables()) {
        if (reservationRepository.existsOverlapExcluding(table.getId(), req.startsAt(), endsAt, id)) {
            conflicts.add("Table '" + table.getLabel() + "' is already booked for this time");
        }
    }
    if (!conflicts.isEmpty()) {
        throw new ConflictException("Booking conflict", conflicts);
    }

    reservation.setGuestName(req.guestName());
    reservation.setPartySize(req.partySize());
    reservation.setStartsAt(req.startsAt());
    reservation.setEndsAt(endsAt);
    reservation.setNotes(req.notes());

    return toDto(reservationRepository.save(reservation));
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd /c/Users/vulf/Restorano/backend && ./mvnw test -pl . -Dtest=ReservationServiceTest -q 2>&1 | tail -10
```
Expected: `Tests run: 7, Failures: 0, Errors: 0` (4 original + 3 new).

- [ ] **Step 5: Commit**

```bash
cd /c/Users/vulf/Restorano && git add backend/src/main/java/com/restorano/backend/reservation/repositories/ReservationRepository.java backend/src/main/java/com/restorano/backend/reservation/dto/UpdateReservationRequest.java backend/src/main/java/com/restorano/backend/reservation/ReservationService.java backend/src/test/java/com/restorano/backend/reservation/ReservationServiceTest.java && git commit -m "feat(backend): add updateReservation endpoint with overlap-excluding check"
```

---

## Task 4: Add PUT endpoint to ReservationController

**Files:**
- Modify: `backend/src/main/java/com/restorano/backend/reservation/ReservationController.java`

- [ ] **Step 1: Add the PUT endpoint**

The existing `import com.restorano.backend.reservation.dto.*;` wildcard already covers `UpdateReservationRequest` — no new import needed.

Add the method after `deleteReservation`:
```java
@PutMapping("/{id}")
@PreAuthorize("hasRole('ADMIN')")
public ReservationDto updateReservation(@PathVariable Long id,
                                        @RequestBody @Valid UpdateReservationRequest req) {
    return reservationService.updateReservation(id, req);
}
```

- [ ] **Step 2: Run full backend test suite**

```bash
cd /c/Users/vulf/Restorano/backend && ./mvnw test -q 2>&1 | tail -10
```
Expected: all tests pass, BUILD SUCCESS.

- [ ] **Step 3: Commit**

```bash
cd /c/Users/vulf/Restorano && git add backend/src/main/java/com/restorano/backend/reservation/ReservationController.java && git commit -m "feat(backend): expose PUT /api/reservations/{id} endpoint"
```

---

## Task 5: Add `updateReservation` to frontend API module

**Files:**
- Modify: `frontend/src/api/reservationApi.ts`

- [ ] **Step 1: Add type and function**

Open `frontend/src/api/reservationApi.ts`. After the `CreateReservationRequest` import line, add:

```ts
export interface UpdateReservationRequest {
  guestName: string;
  partySize: number;
  startsAt: string;   // ISO 8601
  notes?: string;
}
```

Then add the function after `deleteReservation`:
```ts
export async function updateReservation(id: number, req: UpdateReservationRequest): Promise<Reservation> {
  const response = await axiosClient.put<Reservation>(`/reservations/${id}`, req);
  return response.data;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /c/Users/vulf/Restorano/frontend && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

---

## Task 6: Make all tables clickable in TableCell

**Files:**
- Modify: `frontend/src/components/floorplan/TableCell.tsx`

Currently `handleClick` returns early if `status === 'reserved' || status === 'unavailable'`. Remove that guard so all tables are clickable regardless of status.

- [ ] **Step 1: Remove the early-return guard**

In `TableCell.tsx`, change:
```ts
const handleClick = () => {
  if (status === 'reserved' || status === 'unavailable') return;
  onClick?.(table);
};
```
to:
```ts
const handleClick = () => {
  onClick?.(table);
};
```

The visual styles for `reserved` and `unavailable` are unchanged — `STATUS_STYLES` is not modified. The `cursor-not-allowed` style on `reserved`/`unavailable` should change to `cursor-pointer` so users know the table is clickable. Update those two entries in `STATUS_STYLES`:

```ts
reserved:     'bg-[#f5f2ee] border-2 border-[#d6d0c8] text-[#a8a29e] opacity-75 cursor-pointer',
unavailable:  'bg-[#fff1f2] border-2 border-[#fecdd3] text-[#e07070] opacity-60 cursor-pointer',
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /c/Users/vulf/Restorano/frontend && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

---

## Task 7: Add i18n keys for TableDrawer and delete guard

**Files:**
- Modify: `frontend/public/locales/en/translation.json`
- Modify: `frontend/public/locales/et/translation.json`

- [ ] **Step 1: Add English keys**

Add before the closing `}` of `en/translation.json`:

```json
  "tableDrawer.title": "Table {{label}}",
  "tableDrawer.upcomingTitle": "Upcoming Reservations",
  "tableDrawer.emptyState": "No upcoming reservations for this table.",
  "tableDrawer.guests": "{{count}} guests",
  "tableDrawer.edit": "Edit",
  "tableDrawer.cancel": "Cancel",
  "tableDrawer.save": "Save",
  "tableDrawer.delete": "Delete",
  "tableDrawer.errorSave": "Could not save changes. Please try again.",
  "tableDrawer.errorSaveConflict": "Time conflict — this table is already booked then.",
  "tableDrawer.errorDelete": "Could not delete reservation. Please try again.",
  "tableDrawer.newTitle": "New Reservation",
  "tableDrawer.tableBadge": "Table: {{label}} ({{capacity}}p)",
  "tableDrawer.guestName": "Guest Name *",
  "tableDrawer.guestNamePlaceholder": "Full name",
  "tableDrawer.partySize": "Party Size *",
  "tableDrawer.date": "Date *",
  "tableDrawer.time": "Time *",
  "tableDrawer.notes": "Notes",
  "tableDrawer.notesPlaceholder": "Allergies, occasion, etc.",
  "tableDrawer.book": "Book",
  "tableDrawer.errorBook": "Booking failed. Please try again.",
  "tableDrawer.errorBookConflict": "This table is already booked for that time.",
  "tableDrawer.bookedSuccess": "Reservation added.",

  "builder.errorDeleteBlocked": "Cannot delete: {{labels}} has future reservations."
```

- [ ] **Step 2: Add Estonian keys**

Add before the closing `}` of `et/translation.json`:

```json
  "tableDrawer.title": "Laud {{label}}",
  "tableDrawer.upcomingTitle": "Tulevased reserveeringud",
  "tableDrawer.emptyState": "Sellel laual pole tulevasi reserveeringuid.",
  "tableDrawer.guests": "{{count}} külalist",
  "tableDrawer.edit": "Muuda",
  "tableDrawer.cancel": "Tühista",
  "tableDrawer.save": "Salvesta",
  "tableDrawer.delete": "Kustuta",
  "tableDrawer.errorSave": "Muudatuste salvestamine ebaõnnestus. Proovige uuesti.",
  "tableDrawer.errorSaveConflict": "Ajakonflikti — see laud on sel ajal juba broneeritud.",
  "tableDrawer.errorDelete": "Reserveeringu kustutamine ebaõnnestus. Proovige uuesti.",
  "tableDrawer.newTitle": "Uus reserveering",
  "tableDrawer.tableBadge": "Laud: {{label}} ({{capacity}}k)",
  "tableDrawer.guestName": "Külalise nimi *",
  "tableDrawer.guestNamePlaceholder": "Täisnimi",
  "tableDrawer.partySize": "Seltskonna suurus *",
  "tableDrawer.date": "Kuupäev *",
  "tableDrawer.time": "Kellaaeg *",
  "tableDrawer.notes": "Märkused",
  "tableDrawer.notesPlaceholder": "Allergiad, sündmus jne.",
  "tableDrawer.book": "Broneeri",
  "tableDrawer.errorBook": "Broneerimine ebaõnnestus. Proovige uuesti.",
  "tableDrawer.errorBookConflict": "See laud on sellel ajal juba broneeritud.",
  "tableDrawer.bookedSuccess": "Reserveering lisatud.",

  "builder.errorDeleteBlocked": "Ei saa kustutada: laudadel {{labels}} on tulevased reserveeringud."
```

---

## Task 8: Create TableDrawer component

**Files:**
- Create: `frontend/src/components/reservation/TableDrawer.tsx`

This is the largest task. Build it in one step with the full component.

- [ ] **Step 1: Create `TableDrawer.tsx`**

```tsx
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Table } from '../../types/layout';
import type { Reservation } from '../../types/reservation';
import { useLayoutStore } from '../../store/layoutStore';
import { useFilterStore } from '../../store/filterStore';
import * as reservationApi from '../../api/reservationApi';
import MealSuggestions from './MealSuggestions';

interface Props {
  open: boolean;
  onClose: () => void;
  table: Table | undefined;
}

interface RowState {
  editing: boolean;
  guestName: string;
  partySize: number;
  date: string;
  time: string;
  notes: string;
  error: string | null;
  deleteError: string | null;
}

function toDateStr(iso: string) {
  return iso.slice(0, 10);
}
function toTimeStr(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}
function initRow(r: Reservation): RowState {
  return {
    editing: false,
    guestName: r.guestName,
    partySize: r.partySize,
    date: toDateStr(r.startsAt),
    time: toTimeStr(r.startsAt),
    notes: r.notes ?? '',
    error: null,
    deleteError: null,
  };
}

export default function TableDrawer({ open, onClose, table }: Props) {
  const { t } = useTranslation();
  const { date: filterDate } = useFilterStore();

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rowStates, setRowStates] = useState<Record<number, RowState>>({});

  // New booking form state
  const [guestName, setGuestName] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [bookDate, setBookDate] = useState(filterDate);
  const [bookTime, setBookTime] = useState('19:00');
  const [notes, setNotes] = useState('');
  const [bookError, setBookError] = useState<string | null>(null);
  const [bookSuccess, setBookSuccess] = useState(false);

  const refreshReservations = async (tableId: number) => {
    const data = await reservationApi.getReservationsForTable(tableId);
    setReservations(data);
    setRowStates(Object.fromEntries(data.map((r) => [r.id, initRow(r)])));
    // Refresh global store
    const fresh = await reservationApi.getReservations({});
    useLayoutStore.getState().setReservations(fresh);
  };

  useEffect(() => {
    if (open && table) {
      refreshReservations(table.id);
      setGuestName('');
      setPartySize(2);
      setBookDate(filterDate);
      setBookTime('19:00');
      setNotes('');
      setBookError(null);
      setBookSuccess(false);
    }
  }, [open, table]);

  const setRow = (id: number, patch: Partial<RowState>) =>
    setRowStates((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const handleEdit = (id: number) => setRow(id, { editing: true, error: null });
  const handleCancel = (id: number, r: Reservation) => setRow(id, initRow(r));

  const handleSave = async (r: Reservation) => {
    const row = rowStates[r.id];
    if (!row) return;
    try {
      await reservationApi.updateReservation(r.id, {
        guestName: row.guestName.trim(),
        partySize: row.partySize,
        startsAt: new Date(`${row.date}T${row.time}`).toISOString(),
        notes: row.notes.trim() || undefined,
      });
      await refreshReservations(table!.id);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number } };
      const msg = axiosErr?.response?.status === 409
        ? t('tableDrawer.errorSaveConflict')
        : t('tableDrawer.errorSave');
      setRow(r.id, { error: msg });
    }
  };

  const handleDelete = async (r: Reservation) => {
    try {
      await reservationApi.deleteReservation(r.id);
      await refreshReservations(table!.id);
    } catch {
      setRow(r.id, { deleteError: t('tableDrawer.errorDelete') });
    }
  };

  const handleBook = async () => {
    if (!table || !guestName.trim()) return;
    setBookError(null);
    try {
      await reservationApi.createReservation({
        tableIds: [table.id],
        guestName: guestName.trim(),
        partySize,
        startsAt: new Date(`${bookDate}T${bookTime}`).toISOString(),
        notes: notes.trim() || undefined,
      });
      await refreshReservations(table.id);
      setGuestName('');
      setNotes('');
      setBookSuccess(true);
      setTimeout(() => setBookSuccess(false), 3000);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number } };
      setBookError(axiosErr?.response?.status === 409
        ? t('tableDrawer.errorBookConflict')
        : t('tableDrawer.errorBook'));
    }
  };

  if (!open || !table) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-30 transition-opacity" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-40 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#e8e3db] bg-white">
          <h2 className="font-display text-xl font-semibold text-[#1c1917]">
            {t('tableDrawer.title', { label: table.label })}
          </h2>
          <button onClick={onClose} className="text-[#a8a29e] hover:text-[#1c1917] text-2xl leading-none transition-colors">
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* Section A — Upcoming Reservations */}
          <section>
            <h3 className="text-sm font-semibold text-[#1c1917] mb-3 uppercase tracking-wide">
              {t('tableDrawer.upcomingTitle')}
            </h3>

            {reservations.length === 0 ? (
              <p className="text-sm text-[#a8a29e]">{t('tableDrawer.emptyState')}</p>
            ) : (
              <ul className="space-y-2">
                {reservations.map((r) => {
                  const row = rowStates[r.id];
                  if (!row) return null;
                  return (
                    <li key={r.id} className="border border-[#e8e3db] rounded-lg p-3 bg-[#f9f7f4]">
                      {!row.editing ? (
                        <>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[#1c1917] truncate">{r.guestName}</p>
                              <p className="text-xs text-[#78716c]">
                                {t('tableDrawer.guests', { count: r.partySize })} · {toDateStr(r.startsAt)} {toTimeStr(r.startsAt)}
                              </p>
                              {r.notes && (
                                <p className="text-xs text-[#a8a29e] truncate mt-0.5">{r.notes}</p>
                              )}
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <button
                                onClick={() => handleEdit(r.id)}
                                className="text-xs px-2 py-1 rounded bg-[#e8e3db] hover:bg-[#d6d0c8] text-[#1c1917] transition-colors"
                              >
                                {t('tableDrawer.edit')}
                              </button>
                              <button
                                onClick={() => handleDelete(r)}
                                className="text-xs px-2 py-1 rounded bg-red-100 hover:bg-red-200 text-red-700 transition-colors"
                              >
                                {t('tableDrawer.delete')}
                              </button>
                            </div>
                          </div>
                          {row.deleteError && (
                            <p className="text-xs text-red-500 mt-1">{row.deleteError}</p>
                          )}
                        </>
                      ) : (
                        <div className="space-y-2">
                          <div>
                            <label className="text-xs font-medium text-[#78716c] block mb-0.5">{t('tableDrawer.guestName')}</label>
                            <input
                              type="text"
                              value={row.guestName}
                              onChange={(e) => setRow(r.id, { guestName: e.target.value })}
                              className="w-full border border-[#e8e3db] rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c3a]"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-[#78716c] block mb-0.5">{t('tableDrawer.partySize')}</label>
                            <input
                              type="number"
                              min={1}
                              max={20}
                              value={row.partySize}
                              onChange={(e) => setRow(r.id, { partySize: parseInt(e.target.value, 10) })}
                              className="w-full border border-[#e8e3db] rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c3a]"
                            />
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="text-xs font-medium text-[#78716c] block mb-0.5">{t('tableDrawer.date')}</label>
                              <input
                                type="date"
                                value={row.date}
                                onChange={(e) => setRow(r.id, { date: e.target.value })}
                                className="w-full border border-[#e8e3db] rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c3a]"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-xs font-medium text-[#78716c] block mb-0.5">{t('tableDrawer.time')}</label>
                              <input
                                type="time"
                                value={row.time}
                                onChange={(e) => setRow(r.id, { time: e.target.value })}
                                className="w-full border border-[#e8e3db] rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c3a]"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-[#78716c] block mb-0.5">{t('tableDrawer.notes')}</label>
                            <textarea
                              rows={2}
                              value={row.notes}
                              onChange={(e) => setRow(r.id, { notes: e.target.value })}
                              className="w-full border border-[#e8e3db] rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c3a] resize-none"
                            />
                          </div>
                          {row.error && <p className="text-xs text-red-500">{row.error}</p>}
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => handleSave(r)}
                              className="flex-1 py-1.5 text-sm bg-[#0f4c3a] text-white rounded hover:bg-[#1a6b52] transition-colors"
                            >
                              {t('tableDrawer.save')}
                            </button>
                            <button
                              onClick={() => handleCancel(r.id, r)}
                              className="flex-1 py-1.5 text-sm bg-[#e8e3db] text-[#1c1917] rounded hover:bg-[#d6d0c8] transition-colors"
                            >
                              {t('tableDrawer.cancel')}
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Divider */}
          <hr className="border-[#e8e3db]" />

          {/* Section B — New Reservation */}
          <section>
            <h3 className="text-sm font-semibold text-[#1c1917] mb-3 uppercase tracking-wide">
              {t('tableDrawer.newTitle')}
            </h3>

            {/* Locked table badge */}
            <div className="mb-3 px-3 py-2 bg-[#f0fdf4] border border-[#b5d5c8] rounded-lg text-sm text-[#0f4c3a] font-medium">
              {t('tableDrawer.tableBadge', { label: table.label, capacity: table.capacity })}
            </div>

            <div className="mb-3">
              <label className="text-xs font-medium text-[#78716c] block mb-1">{t('tableDrawer.guestName')}</label>
              <input
                type="text"
                placeholder={t('tableDrawer.guestNamePlaceholder')}
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full border border-[#e8e3db] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c3a]"
              />
            </div>

            <div className="mb-3">
              <label className="text-xs font-medium text-[#78716c] block mb-1">{t('tableDrawer.partySize')}</label>
              <input
                type="number"
                min={1}
                max={20}
                value={partySize}
                onChange={(e) => setPartySize(parseInt(e.target.value, 10))}
                className="w-full border border-[#e8e3db] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c3a]"
              />
            </div>

            <div className="flex gap-2 mb-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-[#78716c] block mb-1">{t('tableDrawer.date')}</label>
                <input
                  type="date"
                  value={bookDate}
                  onChange={(e) => setBookDate(e.target.value)}
                  className="w-full border border-[#e8e3db] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c3a]"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-[#78716c] block mb-1">{t('tableDrawer.time')}</label>
                <input
                  type="time"
                  value={bookTime}
                  onChange={(e) => setBookTime(e.target.value)}
                  className="w-full border border-[#e8e3db] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c3a]"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="text-xs font-medium text-[#78716c] block mb-1">{t('tableDrawer.notes')}</label>
              <textarea
                rows={2}
                placeholder={t('tableDrawer.notesPlaceholder')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border border-[#e8e3db] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c3a] resize-none"
              />
            </div>

            <MealSuggestions />
          </section>
        </div>

        {/* Footer — Book button */}
        <div className="border-t border-[#e8e3db] p-4 bg-white">
          <button
            onClick={handleBook}
            disabled={!guestName.trim()}
            className="w-full py-3 bg-[#0f4c3a] text-white rounded-lg hover:bg-[#1a6b52] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t('tableDrawer.book')}
          </button>
          {bookError && <p className="text-xs text-red-500 text-center mt-2">{bookError}</p>}
          {bookSuccess && <p className="text-xs text-green-600 text-center mt-2">{t('tableDrawer.bookedSuccess')}</p>}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /c/Users/vulf/Restorano/frontend && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /c/Users/vulf/Restorano && git add frontend/src/api/reservationApi.ts frontend/src/components/floorplan/TableCell.tsx frontend/src/components/reservation/TableDrawer.tsx frontend/public/locales/en/translation.json frontend/public/locales/et/translation.json && git commit -m "feat(frontend): add TableDrawer component with reservation list, inline edit, and new booking"
```

---

## Task 9: Wire TableDrawer in MainPage

**Files:**
- Modify: `frontend/src/pages/MainPage.tsx`

- [ ] **Step 1: Import and add TableDrawer**

In `MainPage.tsx`:

1. Add import at the top:
```ts
import TableDrawer from '../components/reservation/TableDrawer';
import type { Table } from '../types/layout';
```
(The `Table` import is already there — keep it, just confirm it's present.)

2. Add state for the table drawer:
```ts
const [tableDrawerOpen, setTableDrawerOpen] = useState(false);
const [clickedTable, setClickedTable] = useState<Table | undefined>();
```

3. Change `handleTableClick` to open `TableDrawer` instead of `BookingDrawer`:
```ts
const handleTableClick = (table: Table) => {
  setClickedTable(table);
  setTableDrawerOpen(true);
};
```
(The existing `clickedTableId` state + `BookingDrawer` opened via `setDrawerOpen(true)` remain unchanged — they serve the filter bar "New Reservation" button.)

4. Add `TableDrawer` after `BookingDrawer` in the JSX:
```tsx
<TableDrawer
  open={tableDrawerOpen}
  onClose={() => setTableDrawerOpen(false)}
  table={clickedTable}
/>
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /c/Users/vulf/Restorano/frontend && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /c/Users/vulf/Restorano && git add frontend/src/pages/MainPage.tsx && git commit -m "feat(frontend): open TableDrawer on table click"
```

---

## Task 10: Load reservations in AdminPage on mount

**Files:**
- Modify: `frontend/src/pages/AdminPage.tsx`

- [ ] **Step 1: Add useEffect that loads reservations**

In `AdminPage.tsx`, add imports:
```ts
import { useEffect } from 'react';
import * as reservationApi from '../api/reservationApi';
import { useLayoutStore } from '../store/layoutStore';
```

Add a `useEffect` inside the component, before the return:
```ts
useEffect(() => {
  reservationApi.getReservations({}).then((data) => {
    useLayoutStore.getState().setReservations(data);
  });
}, []);
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /c/Users/vulf/Restorano/frontend && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

---

## Task 11: Guard table delete in LayoutBuilder

**Files:**
- Modify: `frontend/src/components/admin/LayoutBuilder.tsx`

- [ ] **Step 1: Import reservations from the store**

At the top of `LayoutBuilder.tsx`, the store is already destructured from `useLayoutStore`. Add `reservations` to the destructuring:
```ts
const { floorPlan, addArea, updateArea, removeArea, addTable, updateTable, removeTable, splitTable, reservations } = useLayoutStore();
```

- [ ] **Step 2: Update `handleDeleteSelected` to check for future reservations**

Replace the existing `handleDeleteSelected` function:

```ts
const handleDeleteSelected = () => {
  const now = new Date().toISOString();
  const blockedLabels = selectedTableIds
    .filter((id) =>
      reservations.some(
        (res) => res.tableIds.includes(id) && res.startsAt > now
      )
    )
    .map((id) => floorPlan.tables.find((t) => t.id === id)?.label ?? String(id));

  if (blockedLabels.length > 0) {
    setOverlapError(t('builder.errorDeleteBlocked', { labels: blockedLabels.join(', ') }));
    setTimeout(() => setOverlapError(null), 3000);
    return;
  }

  selectedTableIds.forEach((id) => removeTable(id));
  setSelectedTableIds([]);
  if (selectedAreaId !== null) {
    removeArea(selectedAreaId);
    setSelectedAreaId(null);
  }
};
```

Note: the original `handleDeleteSelected` also called `removeArea` but only when `selectedAreaId !== null` — preserve that behavior. The guard only applies to tables, not areas.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /c/Users/vulf/Restorano/frontend && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 4: Final commit**

```bash
cd /c/Users/vulf/Restorano && git add frontend/src/pages/AdminPage.tsx frontend/src/components/admin/LayoutBuilder.tsx && git commit -m "feat(frontend): load reservations in AdminPage; guard table delete against future reservations"
```

---

## Task 12: End-to-end smoke test

With `docker compose up -d --build` and `npm run dev` running:

- [ ] Click any **available** table → `TableDrawer` opens, shows table label in header, Section A shows reservations (or empty state), Section B shows booking form with locked table badge.
- [ ] Click a **reserved** (greyed) table → `TableDrawer` opens (was previously blocked).
- [ ] In Section A, click **Edit** on a reservation → row expands into form. Change guest name, click Save → row collapses with updated name. Section A list refreshes.
- [ ] In Section A, click **Delete** → reservation disappears from the list immediately.
- [ ] In Section B, fill in guest name and click **Book** → success message appears, Section A updates to show the new reservation.
- [ ] In Layout Builder, select a table that has a future reservation and click Delete → error banner appears listing the table label. Table is not removed.
- [ ] In Layout Builder, select a table with no future reservations and click Delete → table is deleted normally.
- [ ] The filter bar "New Reservation" button still opens `BookingDrawer` unchanged.
