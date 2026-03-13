# Restorano

A restaurant table reservation management system. Staff see a top-down grid floor plan, filter by date/time/party size/area, book tables with smart recommendations, and view dish suggestions. Admins configure the floor plan layout through a drag-and-draw canvas.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, Zustand |
| Backend | Java 21, Spring Boot 3.x, Flyway, jjwt 0.12, SpringDoc OpenAPI |
| Database | PostgreSQL 16 |
| External API | TheMealDB (proxied via `/api/meals/suggest`) |

---

## Project Structure

```
Restorano/
├── frontend/          # React SPA (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── floorplan/     # FloorPlan, TableCell, TableTooltip, TableLegend, AreaRect
│   │   │   ├── filters/       # FilterBar
│   │   │   ├── reservation/   # BookingDrawer, RecommendedTables, MealSuggestions
│   │   │   ├── admin/         # LayoutBuilder, AdminLogin
│   │   │   └── layout/        # Navbar, AdminGuard
│   │   ├── store/             # Zustand: layoutStore, filterStore, authStore
│   │   ├── types/             # layout.ts, reservation.ts, recommendation.ts, meal.ts
│   │   ├── pages/             # MainPage, AdminPage, LoginPage
│   │   └── utils/             # scoringUtils.ts, gridUtils.ts
│   ├── src/api/           # axiosClient, authApi, layoutApi, reservationApi, mealApi
│   └── package.json
├── backend/           # Spring Boot REST API
│   └── src/main/java/com/restorano/backend/
│       ├── auth/          # Admin entity, JWT auth
│       ├── layout/        # FloorPlan, Area, RestaurantTable
│       ├── reservation/   # Reservation, TableRecommenderService
│       └── util/          # SecurityConfig, GlobalExceptionHandler, MealDbService
├── docker-compose.yml # PostgreSQL 16 on port 5434
└── REQUIREMENTS.md
```

---

## Getting Started

### Full stack (recommended)

```bash
docker compose up -d               # start PostgreSQL (port 5434)
cd backend && ./mvnw spring-boot:run  # start API on :8080

# Seed admin account (one-time):
curl -X POST http://localhost:8080/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","email":"admin@restorano.com","password":"secret"}'

cd frontend && npm run dev         # → http://localhost:5173 (proxies /api → :8080)
```

### Frontend only (no backend)

```bash
cd frontend && npm install && npm run dev
# → http://localhost:5173 (floor plan loads empty; all API calls fail gracefully)
```

---

## Features

### Staff (no login required)

- **Floor plan view** — top-down grid showing all tables, color-coded by availability
- **Filter bar** — filter by date/time, party size, and area simultaneously
- **Hover tooltip** — see upcoming reservations for any table
- **Booking form** — book a table by clicking it or using the "New Reservation" button
- **Table recommendations** — enter party size + preferred area to get up to 5 scored suggestions highlighted on the map
- **Dish suggestions** — search TheMealDB for meal ideas during the booking flow

### Admin (login required)

- **Layout builder** — drag-draw areas and tables on a grid canvas
  - Draw named, colored area zones (minimum 2×2 cells, no overlap allowed)
  - Drag edges/corners to resize areas
  - Draw tables by dragging; tables constrained to the area they start in
  - Edit table label and capacity inline when selected
  - Join multiple tables into one fused table (instant, no modal)
  - Split fused tables back to their originals
  - Move tables by dragging

---

## Recommendation Algorithm

Tables are scored when party size and datetime are provided:

```
efficiencyScore  = 1.0 - (waste / capacity) * 0.8
  hard cutoff: table capacity > partySize × 2 → eliminated
areaScore        = 1.0 (preferred area match) | 0.5 (no preference) | 0.0 (mismatch)
finalScore       = efficiencyScore × 0.65 + areaScore × 0.35
```

Top 5 results returned, minimum score 0.1.

---

## API

### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/signup` | Register admin account |
| POST | `/api/auth/login` | Login, returns JWT |

### Layout

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/layout` | None | Full floor plan |
| PUT | `/api/layout` | Admin | Atomically replace all areas + tables |

### Reservations

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/reservations` | None | Filter by `date`, `partySize`, `areaId` |
| POST | `/api/reservations` | None | Create reservation (`tableIds: number[]`) |
| DELETE | `/api/reservations/{id}` | Admin | Cancel |
| GET | `/api/reservations/table/{tableId}` | None | Upcoming for a table |
| POST | `/api/reservations/recommend` | None | Scored recommendations |

### Meals

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/meals/suggest?keyword={q}` | Proxy to TheMealDB |

---

## Key Design Decisions

**Multi-table reservations** — a single booking can hold multiple tables (`reservation_tables` junction). This handles large-party seating without touching the layout (no time-bound fusion needed).

**Fuse/split safety** — joining tables is blocked if any constituent table has future reservations; splitting is blocked if the fused table has reservations. Staff must cancel or move bookings first.

**Double-booking prevention** — PostgreSQL `btree_gist` exclusion constraint on `(table_id, tstzrange(starts_at, ends_at))` in `reservation_tables`.

**Reservation window** — always 2.5 hours (`ends_at = starts_at + interval '2.5 hours'`); auto-expired (no manual cleanup needed at query time).

---

## Build Status

| Stage | Status |
|-------|--------|
| Stage 1 — Frontend (mock data) | ✅ Complete |
| Stage 2 — Backend core | ✅ Complete |
| Stage 3 — API integration | ✅ Complete |
| Stage 4 — Polish | 🔶 Partial (Flyway + OpenAPI done) |
