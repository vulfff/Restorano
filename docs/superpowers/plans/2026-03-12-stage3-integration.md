# Stage 3 — Frontend ↔ Backend Integration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all mock data and mock auth in the React frontend with real API calls to the Spring Boot backend.

**Architecture:** TanStack Query owns server state (layout, reservations, meals); Zustand owns UI state (selected tables, filters, auth token). A thin `api/` layer contains pure HTTP functions. Hooks in `hooks/` wrap these with TanStack Query semantics.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, Zustand, TanStack Query v5, axios, Java 21 / Spring Boot 3.2.5 / PostgreSQL

---

## File Map

### New files to create
```
frontend/src/types/auth.ts                   ← LoginResponse, LoginRequest
frontend/src/api/axiosClient.ts              ← axios instance + JWT interceptor
frontend/src/api/authApi.ts                  ← login()
frontend/src/api/layoutApi.ts                ← getLayout(), saveLayout()
frontend/src/api/reservationApi.ts           ← CRUD + recommend, mapTableDto mapper
frontend/src/api/mealApi.ts                  ← suggestMeals()
frontend/src/hooks/useLayout.ts              ← useQuery ['layout']
frontend/src/hooks/useReservations.ts        ← useQuery ['reservations', filter]
frontend/src/hooks/useTableReservations.ts   ← useQuery ['reservations','table',id]
frontend/src/hooks/useSaveLayout.ts          ← useMutation, invalidates layout+reservations
frontend/src/hooks/useCreateReservation.ts   ← useMutation, invalidates reservations
frontend/src/hooks/useDeleteReservation.ts   ← useMutation, invalidates reservations
frontend/src/hooks/useRecommend.ts           ← useMutation with TableDto→Table mapping
frontend/src/hooks/useSuggestMeals.ts        ← useQuery ['meals', keyword]
```

### Existing files to modify
```
frontend/src/types/reservation.ts            ← tableId→tableIds[], update ReservationRequest
frontend/src/store/layoutStore.ts            ← remove mock, selectedTableId→[]
frontend/src/store/authStore.ts              ← remove mock login logic
frontend/src/main.tsx                        ← QueryClientProvider
frontend/src/pages/MainPage.tsx              ← useLayout + useReservations hooks
frontend/src/components/floorplan/TableCell.tsx       ← remove reservations prop
frontend/src/components/floorplan/TableTooltip.tsx    ← self-fetch via useTableReservations
frontend/src/components/floorplan/FloorPlan.tsx       ← multi-select click handler
frontend/src/components/reservation/BookingDrawer.tsx ← multi-table, real API
frontend/src/components/reservation/RecommendedTables.tsx ← accept ScoredTable[]
frontend/src/components/reservation/MealSuggestions.tsx   ← useSuggestMeals
frontend/src/components/admin/AdminLogin.tsx ← real authApi.login()
frontend/src/components/admin/LayoutBuilder.tsx ← seed+save layout, dirty flag
backend/src/main/java/com/restorano/backend/layout/FloorPlanService.java ← fix areaId bug
README.md                                    ← remove "not yet built" notes
PLAN.md                                      ← mark Stage 2 complete, fill Stage 3
CLAUDE.md                                    ← update hooks/ dir, state boundary
```

---

## Chunk 1: Infrastructure — Types, API Layer, Hooks, QueryClientProvider

### Task 1: Fix `Reservation` type (tableId → tableIds)

**Files:**
- Modify: `frontend/src/types/reservation.ts`

- [ ] Open `frontend/src/types/reservation.ts`. Change `Reservation.tableId: number` to `tableIds: number[]`. Change `ReservationRequest.tableId: number` to `tableIds: number[]`.

```typescript
export interface Reservation {
  id: number;
  tableIds: number[];       // ← was tableId: number
  guestName: string;
  partySize: number;
  startsAt: string;         // ISO 8601
  endsAt: string;
  notes: string | null;
  createdAt: string;
}

export interface ReservationRequest {
  tableIds: number[];       // ← was tableId: number
  guestName: string;
  partySize: number;
  startsAt: string;
  notes?: string;
}

export interface ReservationFilter {
  date?: string;
  partySize?: number;
  areaId?: number;
}
```

- [ ] Run `cd frontend && npm run build` — expect TypeScript errors referencing `tableId` in: `layoutStore.ts` (fixed in Task 3), `BookingDrawer.tsx` (fixed in Task 15), `TableCell.tsx`, `TableTooltip.tsx` (both fixed below). Note the errors; do not fix them yet.

- [ ] **Also fix `TableCell.tsx` now:** Find every `r.tableId === table.id` reference and replace with `r.tableIds.includes(table.id)`. (TableCell filters its own reservation list for the tooltip — this must match the new type.)

- [ ] **Also fix `TableTooltip.tsx` now:** Find every `r.tableId === table.id` or `r.tableId` reference and replace with `r.tableIds.includes(table.id)`. (TableTooltip renders reservation detail — after Task 14 it will self-fetch, but fix the type reference now so the build passes.)

---

### Task 2: Create `types/auth.ts`

**Files:**
- Create: `frontend/src/types/auth.ts`

- [ ] Create the file:

```typescript
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  username: string;
}
```

---

### Task 3: Update `layoutStore.ts` — remove mock data, multi-select, fix tableIds

**Files:**
- Modify: `frontend/src/store/layoutStore.ts`

- [ ] Replace the entire file with the following (preserves all existing actions, removes mock data, upgrades selection model, fixes tableId reference):

```typescript
import { create } from 'zustand';
import type { FloorPlan, Table, Area, TableStatus } from '../types/layout';
import type { Reservation } from '../types/reservation';

interface LayoutState {
  floorPlan: FloorPlan;
  selectedTableIds: number[];
  recommendedTableIds: number[];
  hoveredTableId: number | null;
  isEditMode: boolean;
  isDirty: boolean;
  tableStatuses: Record<number, TableStatus>;

  setFloorPlan: (fp: FloorPlan) => void;
  toggleTableSelection: (id: number) => void;
  clearSelection: () => void;
  setRecommended: (ids: number[]) => void;
  setHovered: (id: number | null) => void;
  setEditMode: (edit: boolean) => void;
  setDirty: (dirty: boolean) => void;
  updateTable: (table: Table) => void;
  addTable: (table: Table) => void;
  removeTable: (id: number) => void;
  splitTable: (fusedId: number) => void;
  addArea: (area: Area) => void;
  updateArea: (area: Area) => void;
  removeArea: (id: number) => void;
  computeTableStatuses: (reservations: Reservation[], filterDate?: string, filterPartySize?: number) => void;
}

const EMPTY_FLOOR_PLAN: FloorPlan = {
  id: 1,
  gridCols: 20,
  gridRows: 14,
  areas: [],
  tables: [],
};

export const useLayoutStore = create<LayoutState>((set, get) => ({
  floorPlan: EMPTY_FLOOR_PLAN,
  selectedTableIds: [],
  recommendedTableIds: [],
  hoveredTableId: null,
  isEditMode: false,
  isDirty: false,
  tableStatuses: {},

  setFloorPlan: (fp) => set({ floorPlan: fp }),

  toggleTableSelection: (id) =>
    set((state) => ({
      selectedTableIds: state.selectedTableIds.includes(id)
        ? state.selectedTableIds.filter((x) => x !== id)
        : [...state.selectedTableIds, id],
    })),

  clearSelection: () => set({ selectedTableIds: [] }),

  setRecommended: (ids) => set({ recommendedTableIds: ids }),
  setHovered: (id) => set({ hoveredTableId: id }),
  setEditMode: (edit) => set({ isEditMode: edit }),
  setDirty: (dirty) => set({ isDirty: dirty }),

  updateTable: (table) =>
    set((state) => ({
      floorPlan: {
        ...state.floorPlan,
        tables: state.floorPlan.tables.map((t) => (t.id === table.id ? table : t)),
      },
      isDirty: true,
    })),

  addTable: (table) =>
    set((state) => ({
      floorPlan: {
        ...state.floorPlan,
        tables: [...state.floorPlan.tables, table],
      },
      isDirty: true,
    })),

  removeTable: (id) =>
    set((state) => ({
      floorPlan: {
        ...state.floorPlan,
        tables: state.floorPlan.tables.filter((t) => t.id !== id),
      },
      isDirty: true,
    })),

  splitTable: (fusedId) =>
    set((state) => ({
      floorPlan: {
        ...state.floorPlan,
        tables: state.floorPlan.tables
          .filter((t) => t.id !== fusedId)
          .map((t) =>
            t.parentFusedId === fusedId ? { ...t, parentFusedId: null } : t
          ),
      },
      isDirty: true,
    })),

  addArea: (area) =>
    set((state) => ({
      floorPlan: {
        ...state.floorPlan,
        areas: [...state.floorPlan.areas, area],
      },
      isDirty: true,
    })),

  updateArea: (area) =>
    set((state) => ({
      floorPlan: {
        ...state.floorPlan,
        areas: state.floorPlan.areas.map((a) => (a.id === area.id ? area : a)),
      },
      isDirty: true,
    })),

  removeArea: (id) =>
    set((state) => ({
      floorPlan: {
        ...state.floorPlan,
        areas: state.floorPlan.areas.filter((a) => a.id !== id),
      },
      isDirty: true,
    })),

  computeTableStatuses: (reservations, filterDate?, filterPartySize?) => {
    const { floorPlan, selectedTableIds, recommendedTableIds } = get();
    const statuses: Record<number, TableStatus> = {};

    const now = filterDate ? new Date(filterDate) : new Date();

    for (const table of floorPlan.tables) {
      if (selectedTableIds.includes(table.id)) {
        statuses[table.id] = 'selected';
        continue;
      }
      if (recommendedTableIds.includes(table.id)) {
        statuses[table.id] = 'recommended';
        continue;
      }

      const hasOverlap = reservations.some(
        (r) => r.tableIds.includes(table.id) &&
               new Date(r.endsAt) > now &&
               new Date(r.startsAt) <= now
      );

      if (hasOverlap) {
        statuses[table.id] = 'reserved';
      } else if (filterPartySize && table.capacity < filterPartySize) {
        statuses[table.id] = 'unavailable';
      } else {
        statuses[table.id] = 'available';
      }
    }

    set({ tableStatuses: statuses });
  },
}));
```

---

### Task 4: Update `authStore.ts` — remove mock login logic

**Files:**
- Modify: `frontend/src/store/authStore.ts`

- [ ] Read `frontend/src/store/authStore.ts` fully, then replace login logic so it only stores values (no HTTP calls happen here):

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  username: string | null;
  isAdmin: boolean;
  login: (token: string, username: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      username: null,
      isAdmin: false,
      login: (token, username) => set({ token, username, isAdmin: true }),
      logout: () => set({ token: null, username: null, isAdmin: false }),
    }),
    { name: 'restorano-auth' }
  )
);
```

---

### Task 5: Create `api/axiosClient.ts`

**Files:**
- Create: `frontend/src/api/axiosClient.ts`

- [ ] Check that axios is installed: `cd frontend && npm ls axios`. If missing, run `npm install axios`.

- [ ] Create the file:

```typescript
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const axiosClient = axios.create({
  baseURL: '/api',
});

axiosClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
```

---

### Task 6: Create all `api/*.ts` files

**Files:**
- Create: `frontend/src/api/authApi.ts`
- Create: `frontend/src/api/layoutApi.ts`
- Create: `frontend/src/api/reservationApi.ts`
- Create: `frontend/src/api/mealApi.ts`

- [ ] Create `frontend/src/api/authApi.ts`:

```typescript
import axiosClient from './axiosClient';
import type { LoginRequest, LoginResponse } from '../types/auth';

export const authApi = {
  login: (req: LoginRequest): Promise<LoginResponse> =>
    axiosClient.post<LoginResponse>('/auth/login', req).then((r) => r.data),
};
```

- [ ] Create `frontend/src/api/layoutApi.ts`:

```typescript
import axiosClient from './axiosClient';
import type { FloorPlan } from '../types/layout';

export interface SaveLayoutRequest {
  gridCols: number;
  gridRows: number;
  areas: Array<{
    id: number | null;
    name: string;
    color: string;
    topLeftCol: number;
    topLeftRow: number;
    bottomRightCol: number;
    bottomRightRow: number;
  }>;
  tables: Array<{
    id: number | null;
    label: string;
    capacity: number;
    col: number;
    row: number;
    widthCells: number;
    heightCells: number;
    areaId: number | null;
    isFused: boolean;
    fusedTableIds: number[] | null;
    parentFusedId: number | null;
  }>;
}

export const layoutApi = {
  getLayout: (): Promise<FloorPlan> =>
    axiosClient.get<FloorPlan>('/layout').then((r) => r.data),

  saveLayout: (req: SaveLayoutRequest): Promise<FloorPlan> =>
    axiosClient.put<FloorPlan>('/layout', req).then((r) => r.data),
};
```

- [ ] Create `frontend/src/api/reservationApi.ts`:

```typescript
import axiosClient from './axiosClient';
import type { Table } from '../types/layout';
import type { Reservation, ReservationRequest, ReservationFilter } from '../types/reservation';
import type { ScoredTable, RecommendRequest } from '../types/recommendation';

// Maps the TableDto shape returned by the backend to the frontend Table type.
// The shapes are identical but this makes the mapping explicit.
export function mapTableDto(dto: Table): Table {
  return { ...dto };
}

export const reservationApi = {
  getReservations: (filter: ReservationFilter): Promise<Reservation[]> =>
    axiosClient.get<Reservation[]>('/reservations', { params: filter }).then((r) => r.data),

  getTableReservations: (tableId: number): Promise<Reservation[]> =>
    axiosClient.get<Reservation[]>(`/reservations/table/${tableId}`).then((r) => r.data),

  createReservation: (req: ReservationRequest): Promise<Reservation> =>
    axiosClient.post<Reservation>('/reservations', req).then((r) => r.data),

  deleteReservation: (id: number): Promise<void> =>
    axiosClient.delete(`/reservations/${id}`).then(() => undefined),

  recommend: (req: RecommendRequest): Promise<ScoredTable[]> =>
    axiosClient
      .post<Array<{ table: Table; score: number; efficiencyScore: number; areaPreferenceScore: number; reason: string }>>('/reservations/recommend', req)
      .then((r) =>
        r.data.map((item) => ({
          ...item,
          table: mapTableDto(item.table),
        }))
      ),
};
```

- [ ] Create `frontend/src/api/mealApi.ts`:

```typescript
import axiosClient from './axiosClient';
import type { MealSummary } from '../types/meal';

export const mealApi = {
  suggestMeals: (keyword: string): Promise<MealSummary[]> =>
    axiosClient.get<MealSummary[]>('/meals/suggest', { params: { keyword } }).then((r) => r.data),
};
```

---

### Task 7: Create all `hooks/*.ts` files

**Files:**
- Create: `frontend/src/hooks/useLayout.ts`
- Create: `frontend/src/hooks/useReservations.ts`
- Create: `frontend/src/hooks/useTableReservations.ts`
- Create: `frontend/src/hooks/useSaveLayout.ts`
- Create: `frontend/src/hooks/useCreateReservation.ts`
- Create: `frontend/src/hooks/useDeleteReservation.ts`
- Create: `frontend/src/hooks/useRecommend.ts`
- Create: `frontend/src/hooks/useSuggestMeals.ts`

- [ ] Create `frontend/src/hooks/useLayout.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { layoutApi } from '../api/layoutApi';

export function useLayout() {
  return useQuery({
    queryKey: ['layout'],
    queryFn: layoutApi.getLayout,
  });
}
```

- [ ] Create `frontend/src/hooks/useReservations.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { reservationApi } from '../api/reservationApi';
import type { ReservationFilter } from '../types/reservation';

export function useReservations(filter: ReservationFilter) {
  return useQuery({
    queryKey: ['reservations', filter],
    queryFn: () => reservationApi.getReservations(filter),
  });
}
```

- [ ] Create `frontend/src/hooks/useTableReservations.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { reservationApi } from '../api/reservationApi';

export function useTableReservations(tableId: number | null) {
  return useQuery({
    queryKey: ['reservations', 'table', tableId],
    queryFn: () => reservationApi.getTableReservations(tableId!),
    enabled: tableId !== null,
  });
}
```

- [ ] Create `frontend/src/hooks/useSaveLayout.ts`:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { layoutApi, type SaveLayoutRequest } from '../api/layoutApi';

export function useSaveLayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: SaveLayoutRequest) => layoutApi.saveLayout(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['layout'] });
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
  });
}
```

- [ ] Create `frontend/src/hooks/useCreateReservation.ts`:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reservationApi } from '../api/reservationApi';
import type { ReservationRequest } from '../types/reservation';

export function useCreateReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: ReservationRequest) => reservationApi.createReservation(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
  });
}
```

- [ ] Create `frontend/src/hooks/useDeleteReservation.ts`:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reservationApi } from '../api/reservationApi';

export function useDeleteReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => reservationApi.deleteReservation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
  });
}
```

- [ ] Create `frontend/src/hooks/useRecommend.ts`:

```typescript
import { useMutation } from '@tanstack/react-query';
import { reservationApi } from '../api/reservationApi';
import type { RecommendRequest } from '../types/recommendation';

export function useRecommend() {
  return useMutation({
    mutationFn: (req: RecommendRequest) => reservationApi.recommend(req),
  });
}
```

- [ ] Create `frontend/src/hooks/useSuggestMeals.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { mealApi } from '../api/mealApi';

export function useSuggestMeals(keyword: string) {
  return useQuery({
    queryKey: ['meals', keyword],
    queryFn: () => mealApi.suggestMeals(keyword),
    enabled: keyword.length >= 2,
  });
}
```

---

### Task 8: Add `QueryClientProvider` to `main.tsx`

**Files:**
- Modify: `frontend/src/main.tsx`

- [ ] Replace `frontend/src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import App from './App.tsx';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
```

- [ ] Run `cd frontend && npm run build` — fix any TypeScript errors (most should now be resolved by Task 3). Note remaining errors for upcoming tasks.

- [ ] Commit:

```bash
cd frontend
git add src/types/auth.ts src/types/reservation.ts src/store/layoutStore.ts \
  src/store/authStore.ts src/main.tsx \
  src/api/axiosClient.ts src/api/authApi.ts src/api/layoutApi.ts \
  src/api/reservationApi.ts src/api/mealApi.ts \
  src/hooks/useLayout.ts src/hooks/useReservations.ts \
  src/hooks/useTableReservations.ts src/hooks/useSaveLayout.ts \
  src/hooks/useCreateReservation.ts src/hooks/useDeleteReservation.ts \
  src/hooks/useRecommend.ts src/hooks/useSuggestMeals.ts
git commit -m "feat: add api layer, TanStack Query hooks, and QueryClientProvider (Stage 3 infra)"
```

---

## Chunk 2: Auth + Layout

### Task 9: Real auth in `AdminLogin.tsx`

**Files:**
- Modify: `frontend/src/components/admin/AdminLogin.tsx`

- [ ] Read `frontend/src/components/admin/AdminLogin.tsx`.

- [ ] Replace the mock submit handler with real auth. Find the block that does the 600ms fake delay and mock token, replace with:

```typescript
import { authApi } from '../../api/authApi';
import { useAuthStore } from '../../store/authStore';

// Inside the submit handler:
setLoading(true);
setError('');
try {
  const response = await authApi.login({ username, password });
  useAuthStore.getState().login(response.token, response.username);
  navigate('/admin');
} catch {
  setError('Invalid username or password');
} finally {
  setLoading(false);
}
```

---

### Task 10: Backend fix — `FloorPlanService.saveLayout()` area ID mapping

**Files:**
- Modify: `backend/src/main/java/com/restorano/backend/layout/FloorPlanService.java`

**Background:** After `fp.getAreas().clear()` and re-adding areas, Hibernate flushes and assigns new DB IDs to the new Area entities. The code then tries `a.getId().equals(dto.areaId())` — but `a.getId()` is now a NEW auto-increment ID (e.g. 5, 6, 7) while `dto.areaId()` is the OLD frontend ID (e.g. 1, 2, 3) or a negative temp ID. They never match, so all tables lose their area assignment silently.

**Fix:** Build a `Map<Long, Area>` from DTO area id → new Area entity BEFORE the flush, keyed by insertion order.

- [ ] Read `FloorPlanService.java:54-96` (the area+table replace section).

- [ ] Replace lines 54–96 with:

```java
        // --- Replace areas ---
        List<AreaDto> areaDtos = req.areas() != null ? req.areas() : List.of();
        fp.getAreas().clear();
        // Track insertion order to build dtoId→entity map after flush
        List<Area> orderedNewAreas = new ArrayList<>();
        for (AreaDto dto : areaDtos) {
            Area area = new Area();
            area.setFloorPlan(fp);
            area.setName(dto.name());
            area.setColor(dto.color());
            area.setTopLeftCol(dto.topLeftCol());
            area.setTopLeftRow(dto.topLeftRow());
            area.setBottomRightCol(dto.bottomRightCol());
            area.setBottomRightRow(dto.bottomRightRow());
            fp.getAreas().add(area);
            orderedNewAreas.add(area);
        }

        // --- Replace tables (two-pass: build entities, then wire FKs) ---
        fp.getTables().clear();
        floorPlanRepository.saveAndFlush(fp); // flush: orphan areas/tables removed, new areas get DB IDs

        // Build dtoId → saved Area map (areas are flushed and have real IDs now)
        Map<Long, Area> areaByDtoId = new HashMap<>();
        for (int i = 0; i < areaDtos.size(); i++) {
            if (areaDtos.get(i).id() != null) {
                areaByDtoId.put(areaDtos.get(i).id(), orderedNewAreas.get(i));
            }
        }

        List<TableDto> tableDtos = req.tables() != null ? req.tables() : List.of();
        List<RestaurantTable> newTables = new ArrayList<>();
        for (TableDto dto : tableDtos) {
            RestaurantTable t = new RestaurantTable();
            t.setFloorPlan(fp);
            t.setLabel(dto.label());
            t.setCapacity(dto.capacity());
            t.setCol(dto.col());
            t.setRow(dto.row());
            t.setWidthCells(dto.widthCells());
            t.setHeightCells(dto.heightCells());
            t.setFused(dto.isFused());
            if (dto.areaId() != null) {
                Area matchedArea = areaByDtoId.get(dto.areaId());
                if (matchedArea != null) t.setArea(matchedArea);
            }
            fp.getTables().add(t);
            newTables.add(t);
        }
        floorPlanRepository.saveAndFlush(fp); // assign IDs to new table entities
```

- [ ] Keep lines 99–115 (the second pass for parentFused wiring) unchanged.

---

### Task 11: Seed layout in `MainPage.tsx`

**Files:**
- Modify: `frontend/src/pages/MainPage.tsx`

- [ ] Read `frontend/src/pages/MainPage.tsx` fully.

- [ ] Add `useLayout()` and `useReservations()` hooks. Replace mock data usage with real data. The page should:
  1. Call `useLayout()` — on success, call `setFloorPlan(data)`
  2. Call `useReservations({ date: filterDate, partySize, areaId })` — on success, call `computeTableStatuses(data, filterDate, partySize)`
  3. Show a loading spinner (`isLoading`) and error state
  4. Pass `reservations` from TanStack Query to `computeTableStatuses` (not from Zustand)

Key imports to add:
```typescript
import { useEffect } from 'react';
import { useLayout } from '../hooks/useLayout';
import { useReservations } from '../hooks/useReservations';
import { useLayoutStore } from '../store/layoutStore';
import { useFilterStore } from '../store/filterStore';
```

Key logic:
```typescript
const { date, partySize, areaId } = useFilterStore();
const { setFloorPlan, computeTableStatuses } = useLayoutStore();

const { data: floorPlan, isLoading: layoutLoading } = useLayout();
const { data: reservations = [] } = useReservations({ date, partySize, areaId });

useEffect(() => {
  if (floorPlan) setFloorPlan(floorPlan);
}, [floorPlan, setFloorPlan]);

useEffect(() => {
  computeTableStatuses(reservations, date, partySize);
}, [reservations, date, partySize, computeTableStatuses]);
```

---

### Task 12: Seed + Save layout in `LayoutBuilder.tsx`

**Files:**
- Modify: `frontend/src/components/admin/LayoutBuilder.tsx`

- [ ] Read `frontend/src/components/admin/LayoutBuilder.tsx` (it is large — read it fully).

- [ ] Add at the top of the component:

```typescript
import { useLayout } from '../../hooks/useLayout';
import { useSaveLayout } from '../../hooks/useSaveLayout';
import { useLayoutStore } from '../../store/layoutStore';
import type { SaveLayoutRequest } from '../../api/layoutApi';

const { data: serverLayout } = useLayout();
const saveLayoutMutation = useSaveLayout();
const { floorPlan, isDirty, setFloorPlan, setDirty } = useLayoutStore();

// Seed on first load
useEffect(() => {
  if (serverLayout) {
    setFloorPlan(serverLayout);
    setDirty(false);
  }
}, [serverLayout, setFloorPlan, setDirty]);
```

- [ ] Add a "Save Layout" button to the toolbar area. Place it near the existing toolbar buttons:

```tsx
<button
  onClick={handleSave}
  disabled={!isDirty || saveLayoutMutation.isPending}
  className="px-3 py-1.5 text-sm bg-green-700 text-white rounded hover:bg-green-600 disabled:opacity-50"
>
  {saveLayoutMutation.isPending ? 'Saving…' : isDirty ? 'Save Layout *' : 'Saved'}
</button>
```

- [ ] Add the save handler:

```typescript
const handleSave = () => {
  const req: SaveLayoutRequest = {
    gridCols: floorPlan.gridCols,
    gridRows: floorPlan.gridRows,
    areas: floorPlan.areas.map((a) => ({
      id: a.id > 0 ? a.id : null,   // negative temp IDs sent as null; backend creates new
      name: a.name,
      color: a.color,
      topLeftCol: a.topLeftCol,
      topLeftRow: a.topLeftRow,
      bottomRightCol: a.bottomRightCol,
      bottomRightRow: a.bottomRightRow,
    })),
    tables: floorPlan.tables.map((t) => ({
      id: t.id > 0 ? t.id : null,
      label: t.label,
      capacity: t.capacity,
      col: t.col,
      row: t.row,
      widthCells: t.widthCells,
      heightCells: t.heightCells,
      areaId: t.areaId && t.areaId > 0 ? t.areaId : null,
      isFused: t.isFused,
      fusedTableIds: t.fusedTableIds,
      parentFusedId: t.parentFusedId ?? null,
    })),
  };
  saveLayoutMutation.mutate(req, {
    onSuccess: (savedLayout) => {
      setFloorPlan(savedLayout);  // replace with real IDs from response
      setDirty(false);
    },
    onError: (err: unknown) => {
      // Show 409 conflict errors
      const axiosErr = err as { response?: { status: number; data?: { errors?: string[] } } };
      if (axiosErr.response?.status === 409) {
        setSaveError(axiosErr.response.data?.errors?.join('\n') ?? 'Conflict error');
      } else {
        setSaveError('Failed to save layout. Try again.');
      }
    },
  });
};
```

- [ ] Add `saveError` state at the top of the component and display it in the UI:
```typescript
const [saveError, setSaveError] = useState<string | null>(null);
```

- [ ] **Note on negative temp ID area matching:** When the admin draws a new area, it gets a negative temp ID (e.g. -1). When tables are drawn in that area, `table.areaId = -1`. The `handleSave` above sends both `area.id = null` and `table.areaId = null` — meaning the table won't be linked to the area on save. **Fix:** Preserve the temp-ID relationship during serialization by using the original negative value for `areaId` as the DTO key, and send it as-is:

```typescript
// In handleSave, for areas: keep the original id (including negative) as the DTO reference value
areas: floorPlan.areas.map((a) => ({
  id: a.id,   // send as-is; backend's areaByDtoId map will key on this value
  ...
})),
tables: floorPlan.tables.map((t) => ({
  ...
  areaId: t.areaId,   // send as-is; backend looks up by this value in areaByDtoId
  ...
})),
```

The backend fix in Task 10 uses `areaByDtoId.put(areaDtos.get(i).id(), orderedNewAreas.get(i))` — it maps the INCOMING DTO id (whether positive or negative) to the newly saved area entity. So sending negative IDs for new areas/tables works correctly.

- [ ] Run `cd frontend && npm run build` — fix any TypeScript errors.

- [ ] Commit:

```bash
git add frontend/src/components/admin/AdminLogin.tsx \
  frontend/src/pages/MainPage.tsx \
  frontend/src/components/admin/LayoutBuilder.tsx \
  backend/src/main/java/com/restorano/backend/layout/FloorPlanService.java
git commit -m "feat: real auth, layout load/save, backend areaId fix (Stage 3 auth+layout)"
```

---

## Chunk 3: Reservations + Multi-table UI

### Task 13: Remove `reservations` prop from `TableCell` and `FloorPlan`, fix `computeTableStatuses` call site

**Files:**
- Modify: `frontend/src/components/floorplan/TableCell.tsx`
- Modify: `frontend/src/components/floorplan/FloorPlan.tsx`

- [ ] Read both files fully.

- [ ] In `TableCell.tsx`: remove the `reservations: Reservation[]` prop entirely. Remove any logic that passes reservations down to `TableTooltip`. `TableTooltip` self-fetches in Task 14.

- [ ] In `FloorPlan.tsx`:
  - Remove any `reservations` prop from the component signature
  - Remove `reservations={...}` passed to each `TableCell`
  - Replace `selectTable(id)` with `toggleTableSelection(id)` from the updated store
  - **Remove the `computeTableStatuses` call from `FloorPlan.tsx`** — `MainPage.tsx` (Task 11) now owns this call. `FloorPlan.tsx` should only render; it must not recompute statuses.
  - Remove `selectTable` from any imports — use `toggleTableSelection` instead (the old `selectTable` action no longer exists in the updated store)

---

### Task 14: Real reservations in `TableTooltip.tsx`

**Files:**
- Modify: `frontend/src/components/floorplan/TableTooltip.tsx`

- [ ] Read `frontend/src/components/floorplan/TableTooltip.tsx` fully.

- [ ] Replace the mock/prop-based reservation list with:

```typescript
import { useTableReservations } from '../../hooks/useTableReservations';
import { useDeleteReservation } from '../../hooks/useDeleteReservation';
import { useAuthStore } from '../../store/authStore';

// Inside component:
const { data: reservations = [], isLoading } = useTableReservations(table.id);
const deleteMutation = useDeleteReservation();
const isAdmin = useAuthStore((s) => s.isAdmin);
```

- [ ] In the reservation list render, add an admin-only delete button:

```tsx
{isAdmin && (
  <button
    onClick={() => deleteMutation.mutate(r.id)}
    disabled={deleteMutation.isPending}
    className="ml-2 text-red-400 hover:text-red-300 text-xs"
    title="Cancel reservation"
  >
    ✕
  </button>
)}
```

- [ ] Show loading state: `{isLoading && <p className="text-xs text-gray-400">Loading…</p>}`

---

### Task 15: Multi-table + real recommendations + real booking in `BookingDrawer.tsx`

**Files:**
- Modify: `frontend/src/components/reservation/BookingDrawer.tsx`

- [ ] Read `frontend/src/components/reservation/BookingDrawer.tsx` fully.

- [ ] Replace local `scoreTables()` call with `useRecommend()` mutation.

- [ ] Replace single-table selection UI with multi-table list:
  - Read `selectedTableIds` from layoutStore
  - Show each selected table label with a `×` remove button (calls `toggleTableSelection(id)`)

- [ ] Replace mock `POST /api/reservations` TODO with `useCreateReservation()` mutation:

```typescript
import { useCreateReservation } from '../../hooks/useCreateReservation';
import { useRecommend } from '../../hooks/useRecommend';
import { useLayoutStore } from '../../store/layoutStore';

const createMutation = useCreateReservation();
const recommendMutation = useRecommend();
const { selectedTableIds, clearSelection, setRecommended } = useLayoutStore();

// Build startsAt from bookDate + bookTime (existing logic)
const startsAt = `${bookDate}T${bookTime}:00`;

// "Find Tables" button handler:
const handleFindTables = () => {
  recommendMutation.mutate(
    { partySize, preferredAreaId: preferredAreaId || undefined, startsAt },
    { onSuccess: (results) => setRecommended(results.map((r) => r.table.id)) }
  );
};

// "Confirm Booking" button handler:
const handleConfirm = () => {
  if (!selectedTableIds.length || !guestName.trim()) return;
  createMutation.mutate(
    { tableIds: selectedTableIds, guestName, partySize, startsAt, notes },
    {
      onSuccess: () => {
        clearSelection();
        setBooked(true);
      },
      onError: (err: unknown) => {
        const axiosErr = err as { response?: { status: number; data?: { message?: string } } };
        if (axiosErr.response?.status === 409) {
          setBookingError('This table is already booked for that time.');
        } else {
          setBookingError('Failed to create reservation. Try again.');
        }
      },
    }
  );
};
```

- [ ] Fix `occupiedIds` computation (was `r.tableId`, now `r.tableIds[]`):
```typescript
// OLD (broken after Task 1):
const occupiedIds = new Set(reservations.map((r) => r.tableId));
// NEW:
const occupiedIds = new Set<number>();
reservations.forEach((r) => r.tableIds.forEach((id) => occupiedIds.add(id)));
```

- [ ] Replace `selectTable(id)` / `selectTable(null)` calls with `toggleTableSelection(id)` / `clearSelection()` — the old `selectTable` action no longer exists in the updated store.

- [ ] Pass `recommendMutation.data ?? []` to `<RecommendedTables>` instead of client-side results.

---

### Task 16: Update `RecommendedTables.tsx` to accept `ScoredTable[]`

**Files:**
- Modify: `frontend/src/components/reservation/RecommendedTables.tsx`

- [ ] Read `frontend/src/components/reservation/RecommendedTables.tsx` fully.

- [ ] Change prop type from client-side scored results to `ScoredTable[]`. Ensure clicking a recommendation calls `toggleTableSelection(scored.table.id)`:

```typescript
import type { ScoredTable } from '../../types/recommendation';
import { useLayoutStore } from '../../store/layoutStore';

interface Props {
  recommendations: ScoredTable[];
}

export function RecommendedTables({ recommendations }: Props) {
  const { toggleTableSelection, selectedTableIds } = useLayoutStore();
  // render each scored.table.label, scored.score, scored.reason
  // clicking → toggleTableSelection(scored.table.id)
  // highlight if selectedTableIds.includes(scored.table.id)
}
```

- [ ] Run `cd frontend && npm run build` — fix any remaining TypeScript errors.

- [ ] Commit:

```bash
git add frontend/src/components/floorplan/TableCell.tsx \
  frontend/src/components/floorplan/FloorPlan.tsx \
  frontend/src/components/floorplan/TableTooltip.tsx \
  frontend/src/components/reservation/BookingDrawer.tsx \
  frontend/src/components/reservation/RecommendedTables.tsx
git commit -m "feat: multi-table booking, real recommendations, real reservations (Stage 3 reservations)"
```

---

## Chunk 4: Meals + Docs

### Task 17: Real meals in `MealSuggestions.tsx`

**Files:**
- Modify: `frontend/src/components/reservation/MealSuggestions.tsx`

- [ ] Read `frontend/src/components/reservation/MealSuggestions.tsx` fully.

- [ ] Remove the 3 hardcoded `MOCK_MEALS` and the 600ms fake delay. Replace with `useSuggestMeals(keyword)`:

```typescript
import { useSuggestMeals } from '../../hooks/useSuggestMeals';

// Inside component:
const { data: meals = [], isLoading, isError } = useSuggestMeals(keyword);
```

- [ ] Show loading state while `isLoading` is true. Show `isError` message if the API call fails.

- [ ] Commit:

```bash
git add frontend/src/components/reservation/MealSuggestions.tsx
git commit -m "feat: real TheMealDB meal suggestions via /api/meals/suggest (Stage 3 meals)"
```

---

### Task 18: Update `PLAN.md`, `README.md`, `CLAUDE.md`

**Files:**
- Modify: `PLAN.md`
- Modify: `README.md`
- Modify: `CLAUDE.md`

- [ ] In `PLAN.md`:
  - Mark Stage 2 as `**Status: COMPLETE ✓**`
  - Fill in Stage 3 checkboxes with `[x]` for each completed item
  - Fill Stage 3 checklist with all the actual work done (axiosClient, hooks, type migrations, etc.)

- [ ] In `README.md`:
  - Remove `*(not yet built)*` from Backend and Database rows in the tech stack table
  - Update Getting Started to include `docker compose up -d` and `./mvnw spring-boot:run`
  - Update Build Status table: Stage 2 ✅ Complete, Stage 3 ✅ Complete

- [ ] In `CLAUDE.md`:
  - Add `frontend/src/api/` and `frontend/src/hooks/` to the Key source paths section
  - Update State boundary section: Zustand = UI state only; TanStack Query = server state
  - Update Integration Notes to reflect that Stage 3 is complete (Vite proxy active, real JWT, etc.)

- [ ] Commit:

```bash
git add PLAN.md README.md CLAUDE.md
git commit -m "docs: update PLAN.md, README.md, CLAUDE.md for Stage 3 completion"
```

---

## Verification Sequence

Run after all tasks are complete:

**1. Start services:**
```bash
docker compose up -d
cd backend && ./mvnw spring-boot:run
# Open new terminal:
cd frontend && npm run dev
```

**2. Create admin account (first run only):**
```bash
curl -s -X POST http://localhost:8080/api/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","email":"admin@restorano.com","password":"admin123"}' | cat
```

**3. Check floor plan loads:** Open http://localhost:5173 — floor plan should be empty (no mock data) until you save one via admin.

**4. Admin login:** Navigate to http://localhost:5173/login — enter `admin` / `admin123`. Should redirect to `/admin`.

**5. Save a layout:** Draw areas and tables in LayoutBuilder, click "Save Layout". Verify in the DB:
```sql
SELECT * FROM restorano.restaurant_table;
SELECT * FROM restorano.area;
```

**6. Main page:** Navigate to `/`. Floor plan should show your saved layout.

**7. Book a table:** Click a table, enter guest name + party size, click "Find Tables" (should call `/api/reservations/recommend`), confirm. Verify:
```sql
SELECT * FROM restorano.reservation;
SELECT * FROM restorano.reservation_tables;
```

**8. Double-booking prevention:** Try booking the same table for the same time slot again → should show a 409 error message.

**9. Meal suggestions:** Open a booking drawer, type a keyword (e.g. "chicken") in Meal Suggestions → should show real TheMealDB results.

**10. TypeScript build:**
```bash
cd frontend && npm run build
# Expected: zero TypeScript errors, build succeeds
```
