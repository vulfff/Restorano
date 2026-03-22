# Restorano — Build Plan & Progress Tracker

## Stack
- **Frontend**: React + TypeScript (Vite), Tailwind CSS
- **Backend**: Java 21, Spring Boot 3.x
- **Database**: PostgreSQL
- **External API**: TheMealDB (proxied through backend)

---

## Stage 1 — Frontend (Static / Mock Data)
**Status: COMPLETE ✓**

- [x] Scaffold Vite + React + TypeScript, install dependencies
- [x] TypeScript types: `layout.ts`, `reservation.ts`, `recommendation.ts`, `meal.ts`
- [x] Zustand stores: `layoutStore`, `filterStore`, `authStore`
- [x] `FloorPlan.tsx` — CSS grid renderer with areas and tables
- [x] `AreaRect.tsx` — colored area background rectangles
- [x] `TableCell.tsx` — table with all visual states (available/reserved/selected/recommended/unavailable)
- [x] `TableTooltip.tsx` — hover popup showing upcoming reservations
- [x] `TableLegend.tsx` — color legend
- [x] `FilterBar.tsx` — date, time, party size, area filters
- [x] `BookingDrawer.tsx` — slide-in reservation form
- [x] `RecommendedTables.tsx` — scored table list from algorithm
- [x] `MealSuggestions.tsx` — TheMealDB dish search (mock data)
- [x] `LayoutBuilder.tsx` — admin canvas: draw areas, drag-draw tables, move/delete/join/split
- [x] `AdminLogin.tsx` — login form (mock auth)
- [x] `AdminGuard.tsx` — route protection
- [x] `Navbar.tsx` — top navigation with admin links
- [x] Routing: `/` (MainPage), `/login` (LoginPage), `/admin` (AdminPage)
- [x] Client-side scoring algorithm in `scoringUtils.ts`
- [x] Build passes with zero TypeScript errors
- [x] Area editing: select area → resize via 8 handles, edit name/color in sidebar
- [x] Table drag-draw: drag rectangle on canvas to create table (constrained to area)
- [x] Table label/capacity inline editing when single table selected
- [x] Inline table join (no modal): multi-select → "Join Tables" → instant merge
- [x] Table split: select fused table → "Split Table" → constituents restored

---

## Stage 2 — Backend Core
**Status: COMPLETE ✓**

All backend code is written and compiles. Needs PostgreSQL running (`docker compose up -d`) to start.

- [x] Spring Initializr scaffold, `pom.xml` dependencies (Spring Web, JPA, Security, Validation, WebFlux, Actuator, PostgreSQL, Flyway, jjwt 0.12.x, springdoc 2.5, Lombok)
- [x] JPA entities: `Admin`, `FloorPlan`, `Area`, `RestaurantTable`, `Reservation` (junction via `@ManyToMany`)
- [x] Repositories: `AdminRepository`, `FloorPlanRepository`, `RestaurantTableRepository`, `ReservationRepository`
- [x] `SecurityConfig`, `JwtUtils`, `AuthTokenFilter`, `AuthEntryPoint`
- [x] `AuthService` + `AuthController` (`POST /api/auth/signup`, `POST /api/auth/login`)
- [x] `FloorPlanService` + `FloorPlanController` (`GET /api/layout`, `PUT /api/layout` — atomic replace, fuse/split safety built in)
- [x] `ReservationService` + `ReservationController` (list, create, delete, by-table, recommend)
- [x] `TableRecommenderService` (scoring algorithm: efficiency 65% + area preference 35%)
- [x] `MealDbService` + `MealController` (`GET /api/meals/suggest?keyword=`)
- [x] `GlobalExceptionHandler` + `ConflictException` (409) + `NotFoundException` (404)
- [x] `docker-compose.yml` — PostgreSQL 16 on port 5434, backend on 8080
- [x] `application.properties` — datasource, Flyway, JWT, SpringDoc, Jackson ISO dates
- [x] Flyway migration `V1__init_schema.sql` — full schema with seed floor plan row

> **Note:** No separate AreaController / TableController — all mutations go through the atomic `PUT /api/layout` (replaces all areas + tables in one transaction). Fuse/split conflict checks run inside `FloorPlanService.saveLayout()`.

---

## Stage 3 — API Integration
**Status: COMPLETE ✓**

All mock data replaced with real API calls. Frontend connects to the running backend via Vite proxy.

### To run the full stack
```bash
docker compose up -d          # start PostgreSQL (port 5434)
cd backend && ./mvnw spring-boot:run   # start API on :8080
cd frontend && npm run dev    # Vite proxy /api → http://localhost:8080
# Seed admin: POST /api/auth/signup { username, email, password }
```

### Completed tasks

- [x] `frontend/src/api/axiosClient.ts` — Axios instance with base URL `/api`, JWT `Authorization` header interceptor (reads from `authStore`)
- [x] `frontend/src/api/authApi.ts` — `login(username, password)`, `signup(username, email, password)`
- [x] `frontend/src/api/layoutApi.ts` — `getLayout()`, `saveLayout(floorPlan)`
- [x] `frontend/src/api/reservationApi.ts` — `getReservations(filters)`, `createReservation(req)`, `deleteReservation(id)`, `getReservationsForTable(tableId)`, `recommend(req)`
- [x] `frontend/src/api/mealApi.ts` — `suggestMeals(keyword)`
- [x] `AdminLogin.tsx` — real `POST /api/auth/login`; 401 → specific error, other → generic
- [x] `layoutStore.ts` — mock data removed; `EMPTY_FLOOR_PLAN` placeholder until API loads
- [x] `MainPage.tsx` — `useEffect` on mount loads layout + reservations via `Promise.all`
- [x] `BookingDrawer.tsx` — `POST /api/reservations/recommend` for table suggestions; `POST /api/reservations` on confirm; 409 conflict shown to user
- [x] `LayoutBuilder.tsx` — "Save Layout" wired to `PUT /api/layout`; 409 shows conflicting tables
- [x] `MealSuggestions.tsx` — `GET /api/meals/suggest?keyword=`
- [x] `Reservation` type updated: `tableId: number` → `tableIds: number[]` (matches backend DTO)
- [x] Seed admin: `V2__seed_admin.sql` (admin / admin123)
- [x] Seed demo data: `V3__seed_demo_data.sql` (3 areas, 15 tables, 10 time-relative reservations)
- [ ] End-to-end smoke test

---

## Stage 4 — Polish
**Status: PARTIAL**

- [x] Flyway migration scripts (`V1__init_schema.sql` with correct FK cascades)
- [x] SpringDoc OpenAPI at `/swagger-ui.html` (configured in `application.properties`)
- [x] Backend runs fully in Docker (`docker compose up -d --build` / `docker compose watch`)
- [x] Filter bar date+time now drives table availability colors on the floor plan
- [x] Fuse/split safety: only blocks on not-yet-started reservations (past/ongoing allowed)
- [x] Booking times sent in local timezone (correct UTC conversion via `Date.toISOString()`)
- [x] `ON DELETE CASCADE` on `reservation_tables.table_id` — deleting a table cleans up junction rows
- [ ] `@Scheduled` cleanup task for expired reservations (optional — `ends_at` index covers query-time filtering)
- [ ] React error boundaries and loading states (skeleton loaders, error toasts)
- [ ] `application.properties.example` (strip secret values for repo)

---

## API Reference

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/signup` | None | Register admin |
| POST | `/api/auth/login` | None | Returns JWT |

### Layout
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/layout` | None | Full floor plan (areas + tables) |
| PUT | `/api/layout` | Admin | Atomically replace all areas + tables |

### Reservations
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/reservations` | None | Filter by `date`, `partySize`, `areaId` |
| POST | `/api/reservations` | None | Create (`tableIds: number[]`, `startsAt`, `guestName`, `partySize`) |
| DELETE | `/api/reservations/{id}` | Admin | Cancel |
| GET | `/api/reservations/table/{tableId}` | None | Upcoming for table |
| POST | `/api/reservations/recommend` | None | Scored recommendations |

### Meals
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/meals/suggest?keyword={q}` | Proxy to TheMealDB |

---

## Recommendation Algorithm (Score Formula)
```
efficiencyScore = 1.0 - (waste / capacity) * 0.8
  hard cutoff: waste > partySize * 2 → score = 0.0
areaPreferenceScore = 1.0 (match) | 0.5 (no preference) | 0.0 (mismatch)
finalScore = efficiencyScore * 0.65 + areaPreferenceScore * 0.35
```
Return top 5, filter score < 0.1.
