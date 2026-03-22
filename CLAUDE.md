# Restorano — Agent Navigation Guide

A restaurant table reservation management web app. See `PLAN.md` for full build progress.

## Project Layout

```
Restorano/
├── frontend/          # React + TypeScript (Vite) SPA
├── backend/           # Java 21 Spring Boot REST API
├── docker-compose.yml # PostgreSQL 16 + backend service
├── PLAN.md            # Stage-by-stage progress tracker
├── CLAUDE.md          # This file
└── REQUIREMENTS.md    # Original functional requirements
```

## Current Status

**Stage 1 (Frontend) — COMPLETE.** All components built with mock data.
**Stage 2 (Backend Core) — COMPLETE.** All Spring Boot code written and compiles. Start with `docker compose up -d --build` (or `docker compose watch` for live reload).
**Stage 3 (API Integration) — COMPLETE.** `frontend/src/api/` has axiosClient + 4 API modules; all mock data replaced with real calls. `Reservation.tableIds: number[]` (was `tableId: number`).
**Stage 4 (Polish) — PARTIAL.** Flyway migration (`V1__init_schema.sql`) and SpringDoc OpenAPI configured. Bugs fixed: filter bar date/time now drives table availability colors; fuse/split only blocks on not-yet-started reservations; booking times sent in local timezone; FK cascade prevents errors when deleting tables that had past reservations.

---

## Frontend (`frontend/`)

**Run dev server:**
```bash
cd frontend && npm run dev   # http://localhost:5173
```

**Build:**
```bash
cd frontend && npm run build
```

**Key source paths:**
```
frontend/src/
├── types/
│   ├── layout.ts           # Area, Table, FloorPlan, TableStatus
│   ├── reservation.ts      # Reservation, ReservationRequest, ReservationFilter
│   ├── recommendation.ts   # ScoredTable, RecommendRequest
│   └── meal.ts             # MealSummary
├── store/
│   ├── layoutStore.ts      # FloorPlan state, mock data, table status computation
│   ├── filterStore.ts      # Filter panel state
│   └── authStore.ts        # JWT + admin flag (persisted to localStorage)
├── components/
│   ├── floorplan/
│   │   ├── FloorPlan.tsx       # CORE: CSS grid renderer of areas + tables
│   │   ├── AreaRect.tsx        # Absolute-positioned colored area background
│   │   ├── TableCell.tsx       # Table with all visual states + hover tooltip
│   │   ├── TableTooltip.tsx    # Shows upcoming reservations on hover
│   │   └── TableLegend.tsx     # Status color legend
│   ├── filters/
│   │   └── FilterBar.tsx       # Date/time/party size/area filter controls
│   ├── reservation/
│   │   ├── BookingDrawer.tsx   # Slide-in panel: form + recommendations + meals
│   │   ├── RecommendedTables.tsx # Scored table list (clickable)
│   │   └── MealSuggestions.tsx # TheMealDB dish search (mock currently)
│   ├── admin/
│   │   ├── LayoutBuilder.tsx   # Admin canvas: draw/edit areas, drag-draw/move/delete/join/split tables
│   │   └── AdminLogin.tsx      # Login form (mock auth currently)
│   └── layout/
│       ├── Navbar.tsx          # Top nav with admin links
│       └── AdminGuard.tsx      # Route protection: redirects to /login if not admin
├── pages/
│   ├── MainPage.tsx    # / — floor plan view for all users
│   ├── AdminPage.tsx   # /admin — layout builder (admin only)
│   └── LoginPage.tsx   # /login — admin login
├── utils/
│   ├── scoringUtils.ts # Client-side table recommendation scoring (mirrors backend)
│   └── gridUtils.ts    # Grid coordinate helpers
└── api/                # EMPTY — populated in Stage 3
```

### Grid System
- Grid cell size: `60px × 60px`
- Areas use absolute positioning within a pixel-sized container
- Tables use CSS `gridColumn: col / span widthCells` and `gridRow: row / span heightCells`
- Row/column indices are **1-based**

### Table Visual States (`TableStatus`)
| State | Color | Meaning |
|-------|-------|---------|
| `available` | white/grey border | Bookable for current filter time |
| `reserved` | muted, opacity 70% | Has overlapping reservation |
| `selected` | blue fill | Chosen by user in booking drawer |
| `recommended` | amber/gold, pulsing | Algorithm top-5 suggestion |
| `unavailable` | red tint | Capacity too small for party size |

### Recommendation Algorithm (client-side preview in `scoringUtils.ts`)
```
efficiencyScore = 1.0 - (waste / capacity) * 0.8
  hard cutoff: waste > partySize * 2 → eliminated
areaPreferenceScore = 1.0 | 0.5 | 0.0
finalScore = efficiencyScore * 0.65 + areaPreferenceScore * 0.35
Top 5 returned, filter < 0.1
```

### Layout Builder Interactions (LayoutBuilder.tsx)
| Action | How |
|--------|-----|
| Draw area | Select "▭ Draw Area" tool → click-drag on grid |
| Edit area name/color | Select "↖ Select / Move" → click area → edit in sidebar (live update) |
| Resize area | Select area → drag any of the 8 blue handles (edges + corners) |
| Delete area | Select area → "Delete Area" in sidebar |
| Draw table | Select "▭ Draw Table" tool → click-drag on grid; table is constrained to the area the drag starts in |
| Edit table label/capacity | Select "↖ Select / Move" → click single non-fused table → edit in sidebar (live update) |
| Move table | Select "↖ Select / Move" → drag table |
| Multi-select tables | Shift+click additional tables |
| Join tables | Multi-select 2+ tables → "Join Tables" (instant, no modal) |
| Split fused table | Select fused table → "Split Table" (purple button) |
| Delete table(s) | Select → "Delete" |

### Area Resize Implementation
- Selected area gets 8 `pointer-events-auto` handles (10×10px blue squares) at edges and corners
- Handle `onMouseDown` calls `handleResizeStart(e, area, handle)` with `e.stopPropagation()` to prevent triggering the grid's own mouseDown
- `handleMouseMove` checks `resizeDrag` state first; reads current area from store (not snapshot) to preserve name/color edits made in sidebar
- Minimum area size: 2×2 cells (`MIN_AREA_CELLS = 2`); overlap with other areas is blocked
- Grid cursor updates to match the active handle's resize cursor during drag

### Table Draw Implementation
- `tableDrag` state (same shape as `drawDrag`) tracks the in-progress rectangle
- On `mousedown` (add-table tool): finds which area the cell belongs to; stores it as `constraintArea`
- On `mousemove`: end cell is clamped to `constraintArea` bounds if set, otherwise grid bounds
- On `mouseup`: creates `Table` with `areaId` from `constraintArea`; auto-selects it for immediate editing
- Auto-label: scans existing table labels for numeric suffixes and picks `T(max+1)`
- An indigo dashed preview rect with the default capacity shown is rendered during drag

### Table Join / Split Implementation
- **Joining**: `handleJoinTables()` inline (no modal). Computes bounding box of selected tables, creates fused record, sets `parentFusedId` on constituents. Label auto-set to `T1+T2` pattern.
- **Splitting**: `splitTable(fusedId)` clears `parentFusedId` on constituents and removes the fused record
- **Backend rule (Stage 2)**: fusing is blocked if any constituent has future reservations (409); splitting is blocked if the fused table has future reservations (409)
- Tables with `parentFusedId != null` are hidden from both `FloorPlan.tsx` and `LayoutBuilder.tsx` canvas renders, and excluded from click detection

### Demo Data
Mock data was removed in Stage 3. Demo data now lives in Flyway migrations:
- `V2__seed_admin.sql` — default admin account (`admin` / `admin123`)
- `V3__seed_demo_data.sql` — 3 areas, 15 tables, 10 time-relative reservations

---

## Backend (`backend/`) — NOT YET BUILT

**Plan:** Java 21, Spring Boot 3.x, PostgreSQL schema `restorano`.

**Package:** `com.restorano.backend`

**Module layout:**
```
backend/src/main/java/com/restorano/backend/
├── auth/          # Admin entity, JWT auth
├── layout/        # FloorPlan, Area, RestaurantTable
├── reservation/   # Reservation, TableRecommenderService
└── util/          # SecurityConfig, GlobalExceptionHandler, MealDbService
```

**Key design decisions:**
- Single `FloorPlan` row (id=1); atomic `PUT /api/layout` replaces all areas/tables in one transaction
- Fused tables: new record with `is_fused=true`; constituent tables get `parent_fused_id` set (hidden from render, kept for reversibility)
- **Fuse/split are blocked** if the affected tables have future reservations (return 409 with conflicting table list)
- **Multi-table reservations**: `reservation_tables` junction table replaces `reservation.table_id`; a single booking can hold multiple tables (for large-party use without touching layout)
- Double-booking prevented by `btree_gist` exclusion constraint per `table_id` row in `reservation_tables`
- Reservations auto-expire: `ends_at = starts_at + 2.5h` stored at creation; availability queries use `WHERE ends_at > now()`
- TheMealDB proxied through `/api/meals/suggest` to avoid browser CORS issues

**To start the backend:**
```bash
docker compose up -d --build   # PostgreSQL + backend API on :8080
# OR for live reload (watches backend/src):
docker compose watch
```

**Database schema** lives in `backend/src/main/resources/db/migration/V1__init_schema.sql` (Flyway runs it automatically on first boot).

**Demo seed data** in `V3__seed_demo_data.sql` populates 3 areas, 15 tables, and 10 reservations using `NOW()` so bookings are always time-relevant at init.

**Double-booking prevention**: application-level via `ReservationRepository.existsOverlap()` query (not a DB exclusion constraint — junction table layout prevents direct `EXCLUDE` on time ranges).

---

## Integration Notes (Stage 3 — COMPLETE)

- Vite proxy: `/api` → `http://localhost:8080` (configured in `vite.config.ts`)
- JWT stored in Zustand `authStore` (persisted to localStorage key `restorano-auth`)
- `frontend/src/api/` contains: `axiosClient.ts`, `authApi.ts`, `layoutApi.ts`, `reservationApi.ts`, `mealApi.ts`
- `axiosClient.ts` reads token via `useAuthStore.getState().token` (non-reactive, correct for interceptors)
- `Reservation` type uses `tableIds: number[]` — match this in any new code touching reservations
- `MainPage.tsx` loads floor plan + reservations on mount via `Promise.all` + `useLayoutStore.getState()`
- `BookingDrawer.tsx` uses `reservationApi.recommend()` (not client-side `scoringUtils`) for recommendations
- Seed admin: `admin` / `admin123` (seeded via `V2__seed_admin.sql`)
