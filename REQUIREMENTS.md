# Restorano — Requirements

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React |
| Backend | Java Spring Boot, Java 21 (latest LTS) |
| Database | PostgreSQL |
| External API | TheMealDB |

---

## Roles

| Role | Description |
|------|-------------|
| **Staff** | Front-of-house user. Views the floor plan, manages reservations day-to-day. No login required. |
| **Admin** | Restaurant manager. Has all Staff capabilities plus the ability to configure the restaurant layout. Requires login. |

---

## Functional Requirements

### 1. Floor Plan View

- The main page displays a top-down, grid-based floor plan of the restaurant showing all tables.
- Each table is rendered as a visual cell indicating its label and seating capacity.
- Tables are color-coded by their current status: available, reserved, selected, or recommended.
- Hovering over a table shows a tooltip with its upcoming reservation(s): guest name, party size, and time window.
- The floor plan updates to reflect the current reservation state for the selected date and time.

### 2. Reservation Filtering

Staff can filter the floor plan view by:

- **Date and time** — show availability for a specific moment.
- **Party size** — dim or mark tables that cannot accommodate the group.
- **Area** — highlight or isolate a specific section of the restaurant (e.g. Indoors, Balcony).

Filters apply simultaneously and update the floor plan in real time.

### 3. Booking a Reservation

- Staff can open a booking form by clicking a table or using a "New Reservation" button.
- Required inputs: guest name, party size, preferred date and time.
- Optional inputs: preferred area, notes.
- A reservation blocks a **2.5-hour window** by default, preventing other bookings for the same table during that period.
- Reservations are **automatically released** once their end time passes — no manual action required.

### 4. Table Recommendation

When party size and datetime are entered during booking, the system recommends suitable tables:

- Tables are scored based on two factors:
  - **Efficiency** — how well the table capacity matches the party size. A table significantly larger than needed scores lower. A table meant for 8 must not be offered to a party of 2.
  - **Area preference** — if the guest has a preferred area, tables in that area score higher.
- The top 5 scored tables are presented in ranked order with a short explanation (e.g. "Perfect fit for 4 · Balcony area").
- Recommended tables are highlighted on the floor plan simultaneously.
- Selecting a recommended table pre-fills it into the booking form.

### 5. Admin: Restaurant Layout Builder

Admins can build and modify the restaurant floor plan at any time:

- **Areas** — draw rectangular zones on the grid to represent sections (e.g. Indoors, Balcony, Bar). Each area has a name and a color. Areas must be at least 2×2 cells. Areas cannot overlap.
- **Tables** — place individual tables anywhere on the grid. Each table has a label and a seating capacity.
- **Table fusion** — two or more adjacent tables can be merged into a single larger table. This is fully reversible: fused tables can be split back to their original configuration at any time.
- The layout can be edited and saved at any point. Changes take effect immediately for all users.

### 6. Admin Authentication

- Admins sign up with a username and password.
- Layout editing is restricted to authenticated admins.
- Viewing the floor plan and creating reservations requires no login.

### 7. Dish Recommendations (TheMealDB)

- During the booking flow, staff can optionally search for dish suggestions by keyword.
- Results are fetched from TheMealDB and displayed as a list of dish cards (name, thumbnail, category).
- This is supplementary information only and does not affect the reservation.

---

## Constraints

- A table cannot be double-booked: the system must prevent any two reservations for the same table from overlapping in time.
- A reservation window is always 2–3 hours; the default is 2.5 hours.
- The recommendation algorithm must never suggest a table whose capacity is more than twice the party size.
- The floor plan grid dimensions are configurable by the admin.
- Area and table data must persist across sessions (stored in the database).
