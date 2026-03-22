# Design Spec: Estonian README, Frontend i18n, and Unit Tests

**Date:** 2026-03-22
**Status:** Approved

---

## 1. README — Estonian Chapter

### What
Add a `## Eesti keeles` section at the bottom of `README.md` covering:
- What the app does (one paragraph)
- How to run it (docker + npm dev commands)
- Feature list for staff and admin
- Login credentials

### What is NOT translated
API reference, key design decisions, build status table — these are developer-internal and are not duplicated.

### File changed
- `README.md` — append section at bottom

---

## 2. Frontend i18n (react-i18next, EN ↔ ET)

### Dependencies
- `i18next`, `react-i18next`, and `i18next-http-backend` added to `frontend/package.json` dependencies

### File layout
```
frontend/
├── public/
│   └── locales/
│       ├── en/translation.json
│       └── et/translation.json
└── src/
    └── i18n.ts          # initializer, loaded once in main.tsx
```

### i18n initializer (`src/i18n.ts`)
- Uses `i18next-http-backend` to load JSON files from `public/locales/`
- Default language: `en`; fallback: `en`
- Language stored in `localStorage` key `restorano-lang`

### Language toggle
- Added to `Navbar.tsx` right-hand side (between existing items)
- Two buttons: `EN` and `ET`, active one highlighted
- Calls `i18n.changeLanguage(lang)` on click

### Scope of translated strings
All visible UI strings in:
| Component | Strings |
|-----------|---------|
| `Navbar` | "Layout Builder", "Admin Login", "Logout" |
| `FilterBar` | All labels: Date, Time, Party size, Area, filter button |
| `BookingDrawer` | Form labels: Guest name, Party size, Date, Time, Preferred Area, Notes, table select, submit/cancel buttons, section headings |
| `TableLegend` | All status labels: Available, Reserved, Selected, Recommended, Too small |
| `AdminLogin` / `LoginPage` | Form labels, error messages, button text |
| `RecommendedTables` | Section heading, score label, reason text format |
| `MealSuggestions` | Search label, placeholder, no-results text |

Strings that are NOT translated: table labels (T1, T2…), area names (user-defined), guest names, API error messages from the backend.

### Translation key convention
Flat keys grouped by component prefix, e.g.:
```json
{
  "nav.layoutBuilder": "Layout Builder",
  "nav.adminLogin": "Admin Login",
  "nav.logout": "Logout",
  "filter.date": "Date",
  ...
}
```

---

## 3. Frontend Unit Tests (Vitest)

### Dependencies added (devDependencies)
- `vitest`
- `@vitest/coverage-v8`
- `jsdom`

### Vitest config
Added to existing `vite.config.ts` under a `test` key:
```ts
test: {
  globals: true,
  environment: 'jsdom',
}
```

### Test scripts added to `package.json`
```json
"test": "vitest run",
"test:watch": "vitest"
```

### Test files

**`src/utils/scoringUtils.test.ts`**

| Test case | What it asserts |
|-----------|----------------|
| Perfect fit (waste=0) | efficiency=1.0, final score = 0.65 + 0.35*areaScore |
| Table too small | Excluded from results |
| Table too large (waste > partySize*2) | Excluded (hard cutoff) |
| No area preference | areaScore = 0.5 |
| Preferred area match | areaScore = 1.0 |
| Preferred area mismatch | areaScore = 0.0 |
| More than 5 eligible tables | Returns exactly 5, sorted desc by score |
| Score < 0.1 | Excluded |
| Reason string: perfect fit | "Perfect fit for N" |
| Reason string: with spare | "Seats N of M (K spare)" |
| Reason string: preferred area | appends " · Preferred area" |
| Reason string: different area | appends " · Different area" |
| Reason string: no area preference | no " · " suffix appended |

**`src/utils/gridUtils.test.ts`**

| Test case | What it asserts |
|-----------|----------------|
| `isOccupied`: cell inside a 2×2 table | returns true |
| `isOccupied`: cell outside all tables | returns false |
| `isOccupied`: excluded table id | returns false even if occupied |
| `isOccupied`: boundary cell (last column/row of span) | returns true (exclusive upper bound check) |
| `getTableAt`: hit | returns correct table |
| `getTableAt`: miss | returns undefined |
| `cellsInRect`: single cell | returns 1 cell |
| `cellsInRect`: 2×3 rect | returns 6 cells |
| `cellsInRect`: reversed corners (c2 < c1) | handles correctly |

---

## 4. Backend Unit Tests (JUnit 5 + Mockito)

### No new dependencies needed
`spring-boot-starter-test` (already in pom.xml) includes JUnit 5 + Mockito.

### Test files

**`TableRecommenderServiceTest.java`**
Location: `backend/src/test/java/com/restorano/backend/reservation/`

Setup: mock `ReservationRepository` (all `existsOverlap` calls return `false` by default) and `FloorPlanService` (stub `toTableDto` to return a minimal `TableDto`).

| Test case | What it asserts |
|-----------|----------------|
| Table too small | Not included in results |
| Table too large (hard cutoff) | Not included |
| Perfect fit, no preference | efficiency=1.0, areaScore=0.5, finalScore≈0.825 |
| Table in preferred area | areaScore=1.0 |
| Table not in preferred area | areaScore=0.0 |
| Table occupied (existsOverlap=true) | Excluded |
| Table with parentFused set | Excluded (skip hidden constituents) |
| Score < 0.1 | Excluded |
| More than 5 tables | Returns at most 5, highest scores first |
| Custom durationHours | `endsAt` computed correctly |

**`ReservationServiceTest.java`**
Location: `backend/src/test/java/com/restorano/backend/reservation/`

Setup: mock `ReservationRepository` and `RestaurantTableRepository`.

| Test case | What it asserts |
|-----------|----------------|
| No overlap → reservation saved | `save()` called once, returns DTO |
| One table overlaps | `ConflictException` thrown; assert on `exception.getConflicts()` list containing the table label (e.g. "T1") |
| Multiple tables, one overlaps | `ConflictException`; `getConflicts()` lists only the conflicting table |
| Table not found | Single-table request with `tableRepository.findById()` stubbed to `Optional.empty()`; `NotFoundException` thrown; verify `existsOverlap` never called |

---

## Implementation Order

1. README Estonian section (standalone, no deps)
2. Frontend Vitest setup + tests (no UI changes)
3. Backend unit tests (no code changes)
4. Frontend i18n (touches many component files — last, lowest risk of blocking others)
