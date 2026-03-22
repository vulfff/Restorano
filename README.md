# Restorano

Restaurant table reservation management web app. Staff can view the floor plan, manage reservations per table, and build the restaurant layout. An AI-assisted recommendation engine suggests the best table for each booking.

---

## Requirements / Nõuded

| Tool | Version | Install | Check |
|------|---------|---------|-------|
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | 4.x+ | docker.com | `docker --version` |
| [Node.js](https://nodejs.org/) | 18+ | nodejs.org | `node --version` |
| npm | 9+ (ships with Node) | — | `npm --version` |
| [Git](https://git-scm.com/) | any | git-scm.com | `git --version` |

> Java and PostgreSQL run inside Docker — you do **not** need them installed locally.
>
> Java ja PostgreSQL töötavad Dockeri sees — neid **ei pea** lokaalselt installima.

---

## First-Time Setup / Esmakordne seadistamine

### English

**Prerequisites:** see [Requirements](#requirements--nõuded) above.

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd Restorano
   ```

2. **Start the database and backend**
   ```bash
   docker compose up -d --build
   ```
   This starts PostgreSQL (port 5434) and the Spring Boot API (port 8080).
   On first boot, Flyway automatically runs all migrations and seeds demo data
   including a default admin account (`admin` / `admin123`).

3. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

4. **Start the frontend dev server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

5. **Log in as admin**
   - Click **Admin Login** in the top navigation.
   - Username: `admin` / Password: `admin123`
   - After login you can access the Layout Builder at `/admin`.

> To stop everything: `docker compose down` (add `-v` to also delete the database volume).

---

### Eesti keeles

**Eeltingimused:** vaata eespool olevat [Nõuded](#requirements--nõuded) tabelit.

1. **Klooni repositoorium**
   ```bash
   git clone <repo-url>
   cd Restorano
   ```

2. **Käivita andmebaas ja backend**
   ```bash
   docker compose up -d --build
   ```
   See käivitab PostgreSQL-i (port 5434) ja Spring Boot API (port 8080).
   Esimesel käivitusel rakendab Flyway automaatselt kõik migratsioonid ning loob
   demoandmed koos vaikimisi adminikontoga (`admin` / `admin123`).

3. **Installi frontendi sõltuvused**
   ```bash
   cd frontend
   npm install
   ```

4. **Käivita frontendi arendusserver**
   ```bash
   npm run dev
   ```
   Ava brauseris [http://localhost:5173](http://localhost:5173).

5. **Logi sisse administraatorina**
   - Klõpsa ülemises navigatsiooniribas **Admin Login**.
   - Kasutajanimi: `admin` / Parool: `admin123`
   - Pärast sisselogimist pääsed `/admin` all leiduvasse Paigutusehitajasse.

> Kõige peatamiseks: `docker compose down` (lisa `-v`, kui soovid ka andmebaasi mahu kustutada).

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS v4 |
| State | Zustand v5, TanStack Query v5 |
| HTTP | Axios, Vite proxy `/api → :8080` |
| i18n | i18next — English (`en`) and Estonian (`et`); choice persisted to `localStorage` |
| Backend | Java 21, Spring Boot 3.x |
| Auth | JWT (jjwt 0.12.x), Spring Security |
| Database | PostgreSQL 16, Flyway migrations |
| API Docs | SpringDoc OpenAPI (`/swagger-ui.html`) |
| External | TheMealDB (proxied through backend to avoid CORS) |

---

## Quick Start (returning developers)

```bash
# Start PostgreSQL + backend API
docker compose up -d --build
# or live-reload (watches backend/src, pom.xml, Dockerfile):
docker compose watch

# Start frontend dev server
cd frontend && npm run dev
# → http://localhost:5173
```

---

## Project Layout

```
Restorano/
├── frontend/                     # React + TypeScript SPA
│   ├── public/locales/           # i18n translation files (en, et)
│   └── src/
│       ├── api/                  # Axios API modules
│       ├── components/
│       │   ├── admin/            # LayoutBuilder, AdminLogin
│       │   ├── filters/          # FilterBar
│       │   ├── floorplan/        # FloorPlan, TableCell, AreaRect, TableTooltip, TableLegend
│       │   ├── layout/           # Navbar, AdminGuard
│       │   └── reservation/      # BookingDrawer, TableDrawer, RecommendedTables, MealSuggestions
│       ├── pages/                # MainPage, AdminPage, LoginPage
│       ├── store/                # Zustand stores (layout, filter, auth)
│       ├── types/                # TypeScript type definitions
│       └── utils/                # scoringUtils, gridUtils
├── backend/
│   └── src/main/java/com/restorano/backend/
│       ├── auth/                 # Admin entity, JWT, AuthController
│       ├── layout/               # FloorPlan/Area/Table entities, FloorPlanController
│       ├── reservation/          # Reservation entity, ReservationController, TableRecommenderService
│       └── util/                 # SecurityConfig, GlobalExceptionHandler, MealDbService
├── backend/src/main/resources/
│   ├── application.properties
│   └── db/migration/             # V1__init_schema.sql, V2__seed_admin.sql, V3__seed_demo_data.sql
├── docker-compose.yml
├── PLAN.md                       # Stage-by-stage build progress
├── CLAUDE.md                     # Agent navigation guide
└── REQUIREMENTS.md               # Original functional requirements
```

---

## Features

### Floor Plan View (`/`)

- CSS grid renders areas (colored zones) and tables.
- **Filter bar** — filter by date, time, party size, and area. Table status colors update in real time.
- **Table status colors:**

  | Color | Meaning |
  |-------|---------|
  | White / grey border | Available |
  | Muted, 70% opacity | Reserved (overlapping reservation) |
  | Blue fill | Selected by user |
  | Amber / pulsing | Recommended by algorithm |
  | Red tint | Too small for current party size |

- **Click any table** — opens **TableDrawer**: view upcoming reservations, inline-edit or delete them, or create a new booking directly for that table.
- **+ New Reservation** button — opens **BookingDrawer**: enter guest details, get AI-ranked table recommendations, confirm booking.

### TableDrawer

Slide-in panel opened by clicking any table on the floor plan.

- Lists all upcoming reservations for the table (guest name, party size, date/time, notes).
- **Inline edit** any reservation (guest name, party size, date, time, notes) — calls `PUT /api/reservations/{id}`.
- **Delete** any reservation — calls `DELETE /api/reservations/{id}` (admin JWT required).
- **New booking** form pre-locked to the clicked table — calls `POST /api/reservations`.
- 409 conflict errors shown inline per row.

### BookingDrawer

Slide-in panel opened from the filter bar "+ New Reservation" button.

- Collects guest details and optional area preference.
- Calls `POST /api/reservations/recommend` for scored table suggestions.
- Confirms booking via `POST /api/reservations`.

### Recommendation Algorithm

```
efficiencyScore  = 1.0 − (waste / capacity) × 0.8
  hard cutoff:  waste > partySize × 2  →  score = 0.0
areaScore        = 1.0 (match) | 0.5 (no preference) | 0.0 (mismatch)
finalScore       = efficiencyScore × 0.65 + areaScore × 0.35
```

Returns top 5, filters score < 0.1. Implemented server-side in `TableRecommenderService.java` and mirrored client-side in `scoringUtils.ts` for preview.

### Admin Layout Builder (`/admin`)

Requires admin JWT. Loads current reservations on mount so table delete/fuse/split safety checks reflect live data.

| Action | How |
|--------|-----|
| Draw area | Select "▭ Draw Area" tool → click-drag on grid |
| Resize area | Click area → drag any of 8 blue handles |
| Edit area name/color | Click area → sidebar |
| Delete area | Click area → "Delete Area" in sidebar |
| Draw table | Select "▭ Draw Table" tool → click-drag inside an area |
| Edit table label/capacity | Click single table → sidebar |
| Move table | Drag table |
| Multi-select | Shift+click additional tables |
| Join tables | Multi-select 2+ adjacent tables → "Join Tables" |
| Split fused table | Click fused table → "Split Table" |
| Delete table(s) | Select → "Delete" |
| Save | "Save Layout" → atomic `PUT /api/layout` |

Fuse/split/delete are blocked (409) if any affected table has future reservations.

### Internationalisation

Translations loaded at runtime from `/public/locales/{lang}/translation.json`. Language toggled in the UI and persisted to `localStorage` key `restorano-lang`. Supported: **English** (`en`), **Estonian** (`et`).

### Authentication

- `POST /api/auth/login` returns a JWT stored in Zustand (`authStore`) and persisted to `localStorage` key `restorano-auth`.
- Admin-only endpoints (`PUT /api/layout`, `DELETE /api/reservations/{id}`, `PUT /api/reservations/{id}`) require `Authorization: Bearer <token>`.

---

## API Reference

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/signup` | — | Register admin account |
| POST | `/api/auth/login` | — | Returns JWT |

### Layout

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/layout` | — | Full floor plan (areas + tables) |
| PUT | `/api/layout` | Admin | Atomically replace all areas + tables in one transaction |

### Reservations

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/reservations` | — | Filter by `date`, `partySize`, `areaId` |
| POST | `/api/reservations` | — | Create (`tableIds[]`, `startsAt`, `guestName`, `partySize`, `notes?`) |
| PUT | `/api/reservations/{id}` | Admin | Update guest details / time; 409 on overlap |
| DELETE | `/api/reservations/{id}` | Admin | Cancel reservation |
| GET | `/api/reservations/table/{tableId}` | — | Upcoming reservations for a specific table |
| POST | `/api/reservations/recommend` | — | Scored table recommendations |

### Meals

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/meals/suggest?keyword={q}` | Proxy to TheMealDB dish search |

Interactive docs: **`/swagger-ui.html`**

---

## Database Schema (Flyway)

| Migration | Contents |
|-----------|----------|
| `V1__init_schema.sql` | Full schema: `admins`, `floor_plans`, `areas`, `restaurant_tables`, `reservations`, `reservation_tables` junction, FK cascades, initial floor plan row |
| `V2__seed_admin.sql` | Default admin account (`admin` / `admin123`, bcrypt) |
| `V3__seed_demo_data.sql` | 3 areas, 15 tables, 10 time-relative reservations |

Key design decisions:

- Single `floor_plans` row (`id = 1`); `PUT /api/layout` replaces all areas/tables atomically.
- Fused tables: stored as a new record (`is_fused = true`); constituent tables get `parent_fused_id` set and are hidden from renders.
- Multi-table reservations via `reservation_tables` junction (a booking can span multiple tables).
- Double-booking prevented application-side via `ReservationRepository.existsOverlap()`.
- `ends_at = starts_at + 2.5 h` stored at creation; availability queries filter `WHERE ends_at > now()`.
- `ON DELETE CASCADE` on `reservation_tables.table_id` — deleting a table cleans up its junction rows.

---

## Development Notes

### Grid System

- Cell size: **60 × 60 px**
- Row/column indices are **1-based**
- Areas use absolute pixel positioning; tables use CSS `gridColumn: col / span w` + `gridRow: row / span h`

### Frontend Stores

| Store | Purpose |
|-------|---------|
| `layoutStore` | Floor plan state, reservation list, computed table statuses |
| `filterStore` | Filter bar state (date, time, party size, area) |
| `authStore` | JWT token + admin flag, persisted to `localStorage` |

### Running Tests

```bash
cd frontend && npm test            # vitest run (single pass)
cd frontend && npm run test:watch  # vitest watch mode
```

---

## Eesti keeles

Restorano on restorani lauabroneeringute haldamise veebirakendus. Töötajad näevad restorani põhiplaani ruudustiku vaates, filtreerivad laudu kuupäeva, kellaaja, seltskonna suuruse ja ala järgi, broneerivad laudu arukate soovitustega ning vaatavad roa ettepanekuid. Administraatorid konfigureerivad restorani põhiplaani paigutust lohistamise-ja-joonistamise lõuendil.

### Käivitamine

**1. Käivita taustsüsteem ja andmebaas:**

```bash
docker compose up -d --build
```

See käivitab PostgreSQL 16 ja Spring Boot API aadressil `http://localhost:8080`. Flyway migratsioonid käitatakse automaatselt ja seemnendatakse:
- andmebaasi skeem
- vaikimisi **administraatori konto** (`admin` / `admin123`)
- demo põhiplaan 3 alaga, 15 lauaga ja 10 reserveeringuga praeguse aja ümber

Backendi live-reload arenduse ajal:
```bash
docker compose watch
```

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
- **Lauainfo paneel** — klõpsa laual, et näha kõiki eelseisvaid broneeringuid, neid kohapeal muuta/kustutada või uut broneeringut lisada
- **Broneerimise vorm** — broneeri laud nupu "Uus reserveering" kaudu
- **Laua soovitused** — sisesta seltskonna suurus + eelistatud ala kuni 5 hinnatud ettepaneku saamiseks
- **Roa soovitused** — otsi TheMealDB kaudu roogade ideid broneerimise käigus

**Administraatoritele (sisselogimine vajalik):**

- **Paigutuse kujundaja** — joonista alad ja lauad ruudustiku lõuendil
  - Joonista nimega, värvitud alad (minimaalselt 2×2 lahtrit, kattumist ei lubata)
  - Muuda alade suurust lohistades servi või nurki
  - Joonista lauad lohistades; lauad piiratakse algusalaga
  - Muuda laua silti ja mahtu kohapealt, kui valitud
  - Ühenda mitu lauda üheks (kohene, ilma modaalita)
  - Eralda ühendatud lauad tagasi algseteks
  - Liiguta laudu lohistades
  - Kustutamine/ühendamine/eralda on blokeeritud (409), kui mõjutatud laudadel on tulevasi reserveeringuid
