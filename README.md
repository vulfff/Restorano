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

## Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | 4.x+ | `docker --version` |
| [Node.js](https://nodejs.org/) | 18+ | `node --version` |
| npm | 9+ (ships with Node) | `npm --version` |

> Java and PostgreSQL run inside Docker -- you do **not** need them installed locally.

---

## Getting Started

### 1. Start the backend + database

```bash
docker compose up -d --build
```

This boots PostgreSQL 16 and the Spring Boot API on `http://localhost:8080`. Flyway runs automatically and seeds:
- the database schema
- a default **admin account** (`admin` / `admin123`)
- a demo floor plan with 3 areas, 15 tables, and 10 reservations spread around the current time

For live-reload during backend development:
```bash
docker compose watch
```

### 2. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite dev server proxies `/api` requests to the backend.

### 3. Log in as admin

Navigate to `/login` and sign in with:
| Field | Value |
|-------|-------|
| Username | `admin` |
| Password | `admin123` |

This unlocks the **Layout Builder** at `/admin`.

### Frontend only (no backend)

```bash
cd frontend && npm install && npm run dev
```
The floor plan loads empty and API calls fail gracefully.

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

**Fuse/split safety** — joining tables is blocked if any constituent table has not-yet-started reservations; splitting is blocked if the fused table has not-yet-started reservations. Ongoing or past reservations do not block layout changes.

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

---

## Eesti keeles

Restorano on restorani lauabroneeringute haldamise veebirakendus. Töötajad näevad restorani põhiplaani ruudustiku vaates, filtreerivad laudu kuupäeva, kellaaja, seltskonna suuruse ja ala järgi, broneerivad laudu arukate soovitustega ning vaatavad roa ettepanekuid. Administraatorid konfigureerivad restorani põhiplaani paigutust lohistamise-ja-joonistamise lõuendil.

### Käivitamine

**1. Käivita taustsüsteem ja andmebaas:**

```bash
docker compose up -d --build
```

See käivitab PostgreSQL 16 ja Spring Boot API aadressil `http://localhost:8080`. Flyway migratsioone käitatakse automaatselt ja seemnendatakse:
- andmebaasi skeem
- vaikimisi **administraatori konto** (`admin` / `admin123`)
- demo põhiplaan 3 alaga, 15 lauaga ja 10 reserveeringuga praeguse aja ümber

**2. Käivita kasutajaliides:**

```bash
cd frontend
npm install
npm run dev
```

Ava `http://localhost:5173`.

**3. Logi sisse administraatorina:**

| Väli | Väärtus |
|------|---------|
| Kasutajanimi | `admin` |
| Parool | `admin123` |

See avab **Paigutuse kujundaja** aadressil `/admin`.

### Funktsioonid

**Töötajatele (sisselogimist pole vaja):**

- **Põhiplaani vaade** — kõik lauad, värvikoodiga saadavuse järgi
- **Filtreerimine** — filtreeri kuupäeva/kellaaja, seltskonna suuruse ja ala järgi
- **Hõljutuse kokkuvõte** — vaata iga laua eelseisvaid reserveeringuid
- **Broneerimise vorm** — broneeri laud tabeli klõpsamisega või "Uus reserveering" nupuga
- **Laua soovitused** — sisesta seltskonna suurus + eelistatud ala kuni 5 hinnatud ettepaneku saamiseks
- **Roa soovitused** — otsi TheMealDB kaudu roogade ideid broneerimise käigus

**Administraatoritele (sisselogimine vajalik):**

- **Paigutuse kujundaja** — joonista alad ja lauad ruudustiku lõuendil
  - Joonista nimega, värvitud alad (minimaalselt 2×2 lahtrit, kattumist ei lubata)
  - Muuda alasid suurust lohistades
  - Joonista lauad lohistades; lauad piiratakse algusalaga
  - Muuda laua silti ja mahtu kohapealt, kui valitud
  - Ühenda mitu lauda üheks (kohene, ilma modaalita)
  - Eralda ühendatud lauad tagasi algseteks
  - Liiguta laudu lohistades
