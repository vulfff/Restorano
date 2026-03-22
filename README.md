# Restorano

Restaurant table reservation management web app. Staff can view the floor plan, manage reservations per table, and build the restaurant layout. An AI-assisted recommendation engine suggests the best table for each booking.

Restorani lauabroneeringute haldamise veebirakendus. Töötajad näevad restorani põhiplaani, haldavad broneeringuid laua kaupa ja kujundavad restorani paigutust. AI-põhine soovitusalgoritm pakub iga broneeringu jaoks parima laua.

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

## Stack / Tehnoloogiad

### English

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

### Eesti keeles

| Kiht | Tehnoloogia |
|------|------------|
| Kasutajaliides | React 19, TypeScript, Vite 7, Tailwind CSS v4 |
| Olek | Zustand v5, TanStack Query v5 |
| HTTP | Axios, Vite puhverserver `/api → :8080` |
| Tõlkimine (i18n) | i18next — inglise (`en`) ja eesti (`et`); valik salvestatakse `localStorage`'i |
| Backend | Java 21, Spring Boot 3.x |
| Autentimine | JWT (jjwt 0.12.x), Spring Security |
| Andmebaas | PostgreSQL 16, Flyway migratsioonid |
| API dokumentatsioon | SpringDoc OpenAPI (`/swagger-ui.html`) |
| Välisliidend | TheMealDB (puhverstatakse läbi backendi CORS-i vältimiseks) |

---

## Quick Start / Kiire alustamine

### English

```bash
# Start PostgreSQL + backend API
docker compose up -d --build
# or live-reload (watches backend/src, pom.xml, Dockerfile):
docker compose watch

# Start frontend dev server
cd frontend && npm run dev
# → http://localhost:5173
```

### Eesti keeles

```bash
# Käivita PostgreSQL + backend API
docker compose up -d --build
# või live-reload (jälgib backend/src, pom.xml, Dockerfile):
docker compose watch

# Käivita frontendi arendusserver
cd frontend && npm run dev
# → http://localhost:5173
```

---

## Project Layout / Projekti struktuur

### English

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

### Eesti keeles

```
Restorano/
├── frontend/                     # React + TypeScript SPA
│   ├── public/locales/           # i18n tõlkefailid (en, et)
│   └── src/
│       ├── api/                  # Axios API moodulid
│       ├── components/
│       │   ├── admin/            # LayoutBuilder, AdminLogin
│       │   ├── filters/          # FilterBar
│       │   ├── floorplan/        # FloorPlan, TableCell, AreaRect, TableTooltip, TableLegend
│       │   ├── layout/           # Navbar, AdminGuard
│       │   └── reservation/      # BookingDrawer, TableDrawer, RecommendedTables, MealSuggestions
│       ├── pages/                # MainPage, AdminPage, LoginPage
│       ├── store/                # Zustand salvestused (paigutus, filter, auth)
│       ├── types/                # TypeScript tüübimääratused
│       └── utils/                # scoringUtils, gridUtils
├── backend/
│   └── src/main/java/com/restorano/backend/
│       ├── auth/                 # Admini olem, JWT, AuthController
│       ├── layout/               # FloorPlan/Area/Table olemid, FloorPlanController
│       ├── reservation/          # Reservation olem, ReservationController, TableRecommenderService
│       └── util/                 # SecurityConfig, GlobalExceptionHandler, MealDbService
├── backend/src/main/resources/
│   ├── application.properties
│   └── db/migration/             # V1__init_schema.sql, V2__seed_admin.sql, V3__seed_demo_data.sql
├── docker-compose.yml
├── PLAN.md                       # Etapiviisilise ehituse edenemise jälgija
├── CLAUDE.md                     # Agendi navigeerimise juhend
└── REQUIREMENTS.md               # Algsed funktsionaalsed nõuded
```

---

## Features / Funktsioonid

### English

#### Floor Plan View (`/`)

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

#### TableDrawer

Slide-in panel opened by clicking any table on the floor plan.

- Lists all upcoming reservations for the table (guest name, party size, date/time, notes).
- **Inline edit** any reservation (guest name, party size, date, time, notes) — calls `PUT /api/reservations/{id}`.
- **Delete** any reservation — calls `DELETE /api/reservations/{id}` (admin JWT required).
- **New booking** form pre-locked to the clicked table — calls `POST /api/reservations`.
- 409 conflict errors shown inline per row.

#### BookingDrawer

Slide-in panel opened from the filter bar "+ New Reservation" button.

- Collects guest details and optional area preference.
- Calls `POST /api/reservations/recommend` for scored table suggestions.
- Confirms booking via `POST /api/reservations`.

#### Recommendation Algorithm

```
efficiencyScore  = 1.0 − (waste / capacity) × 0.8
  hard cutoff:  waste > partySize × 2  →  score = 0.0
areaScore        = 1.0 (match) | 0.5 (no preference) | 0.0 (mismatch)
finalScore       = efficiencyScore × 0.65 + areaScore × 0.35
```

Returns top 5, filters score < 0.1. Implemented server-side in `TableRecommenderService.java` and mirrored client-side in `scoringUtils.ts` for preview.

#### Admin Layout Builder (`/admin`)

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

#### Internationalisation

Translations loaded at runtime from `/public/locales/{lang}/translation.json`. Language toggled in the UI and persisted to `localStorage` key `restorano-lang`. Supported: **English** (`en`), **Estonian** (`et`).

#### Authentication

- `POST /api/auth/login` returns a JWT stored in Zustand (`authStore`) and persisted to `localStorage` key `restorano-auth`.
- Admin-only endpoints (`PUT /api/layout`, `DELETE /api/reservations/{id}`, `PUT /api/reservations/{id}`) require `Authorization: Bearer <token>`.

### Eesti keeles

#### Põhiplaani vaade (`/`)

- CSS ruudustik kuvab alad (värvitud tsoonid) ja lauad.
- **Filtribaan** — filtreeri kuupäeva, kellaaja, seltskonna suuruse ja ala järgi. Laudade olekuvärvid uuenevad reaalajas.
- **Laudade olekuvärvid:**

  | Värv | Tähendus |
  |------|----------|
  | Valge / hall äär | Vaba |
  | Tuhm, 70% läbipaistvus | Broneeritud (kattuv reserveering) |
  | Sinine täidis | Kasutaja valitud |
  | Merevaiguvärv / pulseeriv | Algoritmi soovitus |
  | Punane toon | Liiga väike praeguse seltskonna suuruse jaoks |

- **Klõpsa suvalise laua peal** — avaneb **TableDrawer**: vaata eelseisvaid broneeringuid, muuda neid kohapeal või kustuta, või loo uus broneering otse sellele lauale.
- **Nupp "+ Uus reserveering"** — avab **BookingDrawer**: sisesta külalise andmed, saa AI-reastatud lauasoovitused, kinnita broneering.

#### TableDrawer (lauapaneel)

Sisselibisev paneel, mis avaneb klõpsates põhiplaani laua peal.

- Loetleb kõik laua eelseisvad reserveeringud (külalise nimi, seltskonna suurus, kuupäev/kellaaeg, märkmed).
- **Kohapealne muutmine** — muuda külalise nime, seltskonna suurust, kuupäeva, kellaaega, märkmeid — kutsub `PUT /api/reservations/{id}`.
- **Kustutamine** — kustuta reserveering — kutsub `DELETE /api/reservations/{id}` (nõuab admin JWT-d).
- **Uue broneeringu** vorm on eelnevalt lukustatud klõpsatud laua külge — kutsub `POST /api/reservations`.
- 409 konfliktvead kuvatakse kohapeal iga rea juures.

#### BookingDrawer (broneerimispaneel)

Sisselibisev paneel, mis avaneb filtribaari nupust "+ Uus reserveering".

- Kogub külalise andmed ja vabatahtliku ala eelistuse.
- Kutsub `POST /api/reservations/recommend` hinnastatud lauasoovituste saamiseks.
- Kinnitab broneeringu läbi `POST /api/reservations`.

#### Soovitusalgoritm

```
tõhususskoor  = 1,0 − (raiskamine / mahtuvus) × 0,8
  kõva piir:  raiskamine > seltskonnaSuurus × 2  →  skoor = 0,0
alaskoor      = 1,0 (sobib) | 0,5 (eelistust pole) | 0,0 (ei sobi)
lõplikSkoor   = tõhususskoor × 0,65 + alaskoor × 0,35
```

Tagastab 5 parimat, filtreerib skoori < 0,1. Rakendatud serveris `TableRecommenderService.java`-s ja peegeldatud kliendiosas `scoringUtils.ts`-is eelvaatamiseks.

#### Administraatori paigutusehitaja (`/admin`)

Nõuab admin JWT-d. Laadib käivitumisel kehtivad reserveeringud, et laua kustutamise/ühendamise/eraldamise ohutuskontrollid kajastaksid reaalajas andmeid.

| Toiming | Kuidas |
|---------|--------|
| Joonista ala | Vali tööriist "▭ Draw Area" → klõpsa-lohista ruudustikul |
| Muuda ala suurust | Klõpsa alal → lohista mõnda 8-st sinisest pidemest |
| Muuda ala nime/värvi | Klõpsa alal → külgriba |
| Kustuta ala | Klõpsa alal → "Delete Area" külgribal |
| Joonista laud | Vali tööriist "▭ Draw Table" → klõpsa-lohista ala sees |
| Muuda laua silti/mahtu | Klõpsa üksikladual → külgriba |
| Liiguta lauda | Lohista lauda |
| Mitmik-valimine | Shift+klõps lisatavatel laudadel |
| Ühenda lauad | Vali 2+ kõrvutiasetsevat lauda → "Join Tables" |
| Eralda ühendatud laud | Klõpsa ühendatud laual → "Split Table" |
| Kustuta laud/lauad | Vali → "Delete" |
| Salvesta | "Save Layout" → aatomne `PUT /api/layout` |

Ühendamine/eralda/kustutamine on blokeeritud (409), kui mõjutatud laudadel on tulevasi reserveeringuid.

#### Rahvusvahelistumine (i18n)

Tõlked laaditakse käitusajal failist `/public/locales/{lang}/translation.json`. Keelt saab lülitada kasutajaliideses ja see salvestatakse `localStorage` võtme `restorano-lang` alla. Toetatud: **inglise** (`en`), **eesti** (`et`).

#### Autentimine

- `POST /api/auth/login` tagastab JWT, mis salvestatakse Zustandis (`authStore`) ja püsivalt `localStorage` võtme `restorano-auth` alla.
- Ainult administraatorile mõeldud lõpp-punktid (`PUT /api/layout`, `DELETE /api/reservations/{id}`, `PUT /api/reservations/{id}`) nõuavad `Authorization: Bearer <token>`.

---

## API Reference / API-viide

### English

#### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/signup` | — | Register admin account |
| POST | `/api/auth/login` | — | Returns JWT |

#### Layout

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/layout` | — | Full floor plan (areas + tables) |
| PUT | `/api/layout` | Admin | Atomically replace all areas + tables in one transaction |

#### Reservations

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/reservations` | — | Filter by `date`, `partySize`, `areaId` |
| POST | `/api/reservations` | — | Create (`tableIds[]`, `startsAt`, `guestName`, `partySize`, `notes?`) |
| PUT | `/api/reservations/{id}` | Admin | Update guest details / time; 409 on overlap |
| DELETE | `/api/reservations/{id}` | Admin | Cancel reservation |
| GET | `/api/reservations/table/{tableId}` | — | Upcoming reservations for a specific table |
| POST | `/api/reservations/recommend` | — | Scored table recommendations |

#### Meals

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/meals/suggest?keyword={q}` | Proxy to TheMealDB dish search |

Interactive docs: **`/swagger-ui.html`**

### Eesti keeles

#### Autentimine

| Meetod | Tee | Auth | Kirjeldus |
|--------|-----|------|-----------|
| POST | `/api/auth/signup` | — | Registreeri adminikonto |
| POST | `/api/auth/login` | — | Tagastab JWT |

#### Paigutus

| Meetod | Tee | Auth | Kirjeldus |
|--------|-----|------|-----------|
| GET | `/api/layout` | — | Täielik põhiplaan (alad + lauad) |
| PUT | `/api/layout` | Admin | Asendab aatomselt kõik alad + lauad ühes tehingus |

#### Reserveeringud

| Meetod | Tee | Auth | Kirjeldus |
|--------|-----|------|-----------|
| GET | `/api/reservations` | — | Filtreeri `date`, `partySize`, `areaId` järgi |
| POST | `/api/reservations` | — | Loo (`tableIds[]`, `startsAt`, `guestName`, `partySize`, `notes?`) |
| PUT | `/api/reservations/{id}` | Admin | Uuenda külalise andmeid/aega; 409 kattumise korral |
| DELETE | `/api/reservations/{id}` | Admin | Tühista reserveering |
| GET | `/api/reservations/table/{tableId}` | — | Konkreetse laua eelseisvad reserveeringud |
| POST | `/api/reservations/recommend` | — | Hinnastatud lauasoovitused |

#### Toidud

| Meetod | Tee | Kirjeldus |
|--------|-----|-----------|
| GET | `/api/meals/suggest?keyword={q}` | Puhverserver TheMealDB roogade otsingule |

Interaktiivsed dokumendid: **`/swagger-ui.html`**

---

## Database Schema / Andmebaasi skeem

### English

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

### Eesti keeles

| Migratsioon | Sisu |
|-------------|------|
| `V1__init_schema.sql` | Täielik skeem: `admins`, `floor_plans`, `areas`, `restaurant_tables`, `reservations`, `reservation_tables` ristmik, FK kaskaadid, algne põhiplaani rida |
| `V2__seed_admin.sql` | Vaikimisi adminikonto (`admin` / `admin123`, bcrypt) |
| `V3__seed_demo_data.sql` | 3 ala, 15 lauda, 10 ajavõrdelist reserveeringut |

Peamised disainiotsused:

- Üksik `floor_plans` rida (`id = 1`); `PUT /api/layout` asendab kõik alad/lauad aatomselt.
- Ühendatud lauad: talletatakse uue kirjena (`is_fused = true`); koostislaudade `parent_fused_id` seatakse ja need peidetakse renderingutest.
- Mitme-laua reserveeringud läbi `reservation_tables` ristmiku (üks broneering võib hõlmata mitut lauda).
- Topeltbroneerimine ennetatakse rakenduse tasandil `ReservationRepository.existsOverlap()` kaudu.
- `ends_at = starts_at + 2,5 h` salvestatakse loomisel; saadavuspäringud filtreerivad `WHERE ends_at > now()`.
- `ON DELETE CASCADE` `reservation_tables.table_id`-l — laua kustutamine puhastab selle ristmikuread.

---

## Development Notes / Arenduslikud märkmed

### English

#### Grid System

- Cell size: **60 × 60 px**
- Row/column indices are **1-based**
- Areas use absolute pixel positioning; tables use CSS `gridColumn: col / span w` + `gridRow: row / span h`

#### Frontend Stores

| Store | Purpose |
|-------|---------|
| `layoutStore` | Floor plan state, reservation list, computed table statuses |
| `filterStore` | Filter bar state (date, time, party size, area) |
| `authStore` | JWT token + admin flag, persisted to `localStorage` |

#### Running Tests

```bash
cd frontend && npm test            # vitest run (single pass)
cd frontend && npm run test:watch  # vitest watch mode
```

### Eesti keeles

#### Ruudustikusüsteem

- Lahtri suurus: **60 × 60 px**
- Rea-/veeruindeksid on **1-põhised**
- Alad kasutavad absoluutset pikslipõhist paigutust; lauad kasutavad CSS-i `gridColumn: col / span w` + `gridRow: row / span h`

#### Frontendi salvestused

| Salvestus | Eesmärk |
|-----------|---------|
| `layoutStore` | Põhiplaani olek, reserveeringute nimekiri, arvutatud laudade olekud |
| `filterStore` | Filtribaari olek (kuupäev, kellaaeg, seltskonna suurus, ala) |
| `authStore` | JWT token + admini lipp, salvestatakse `localStorage`'i |

#### Testide käivitamine

```bash
cd frontend && npm test            # vitest run (üks läbiminek)
cd frontend && npm run test:watch  # vitest jälgimisrežiim
```
