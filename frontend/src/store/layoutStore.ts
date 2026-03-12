import { create } from 'zustand';
import type { FloorPlan, Table, Area, TableStatus } from '../types/layout';
import type { Reservation } from '../types/reservation';

const MOCK_FLOOR_PLAN: FloorPlan = {
  id: 1,
  gridCols: 20,
  gridRows: 14,
  areas: [
    { id: 1, name: 'Indoors', color: '#dbeafe', topLeftCol: 1, topLeftRow: 1, bottomRightCol: 12, bottomRightRow: 12 },
    { id: 2, name: 'Balcony', color: '#dcfce7', topLeftCol: 13, topLeftRow: 1, bottomRightCol: 19, bottomRightRow: 12 },
    { id: 3, name: 'Bar Area', color: '#fef9c3', topLeftCol: 1, topLeftRow: 13, bottomRightCol: 10, bottomRightRow: 13 },
  ],
  tables: [
    { id: 1, label: 'T1', capacity: 4, col: 2, row: 2, widthCells: 1, heightCells: 1, areaId: 1, isFused: false, fusedTableIds: null },
    { id: 2, label: 'T2', capacity: 4, col: 4, row: 2, widthCells: 1, heightCells: 1, areaId: 1, isFused: false, fusedTableIds: null },
    { id: 3, label: 'T3', capacity: 2, col: 2, row: 5, widthCells: 1, heightCells: 1, areaId: 1, isFused: false, fusedTableIds: null },
    { id: 4, label: 'T4', capacity: 2, col: 4, row: 5, widthCells: 1, heightCells: 1, areaId: 1, isFused: false, fusedTableIds: null },
    { id: 5, label: 'T5', capacity: 8, col: 7, row: 2, widthCells: 2, heightCells: 1, areaId: 1, isFused: false, fusedTableIds: null },
    { id: 6, label: 'T6', capacity: 6, col: 7, row: 5, widthCells: 2, heightCells: 1, areaId: 1, isFused: false, fusedTableIds: null },
    { id: 7, label: 'T7', capacity: 4, col: 10, row: 2, widthCells: 1, heightCells: 1, areaId: 1, isFused: false, fusedTableIds: null },
    { id: 8, label: 'T8', capacity: 4, col: 10, row: 5, widthCells: 1, heightCells: 1, areaId: 1, isFused: false, fusedTableIds: null },
    { id: 9, label: 'B1', capacity: 2, col: 14, row: 2, widthCells: 1, heightCells: 1, areaId: 2, isFused: false, fusedTableIds: null },
    { id: 10, label: 'B2', capacity: 2, col: 16, row: 2, widthCells: 1, heightCells: 1, areaId: 2, isFused: false, fusedTableIds: null },
    { id: 11, label: 'B3', capacity: 4, col: 14, row: 5, widthCells: 1, heightCells: 1, areaId: 2, isFused: false, fusedTableIds: null },
    { id: 12, label: 'B4', capacity: 4, col: 16, row: 5, widthCells: 1, heightCells: 1, areaId: 2, isFused: false, fusedTableIds: null },
    { id: 13, label: 'B5', capacity: 6, col: 14, row: 8, widthCells: 2, heightCells: 1, areaId: 2, isFused: false, fusedTableIds: null },
    { id: 14, label: 'Bar1', capacity: 2, col: 2, row: 13, widthCells: 1, heightCells: 1, areaId: 3, isFused: false, fusedTableIds: null },
    { id: 15, label: 'Bar2', capacity: 2, col: 4, row: 13, widthCells: 1, heightCells: 1, areaId: 3, isFused: false, fusedTableIds: null },
  ],
};

export const MOCK_RESERVATIONS: Reservation[] = [
  { id: 1, tableId: 1, guestName: 'Smith Family', partySize: 3, startsAt: '2026-03-11T12:00:00Z', endsAt: '2026-03-11T14:30:00Z', notes: null, createdAt: '2026-03-10T09:00:00Z' },
  { id: 2, tableId: 5, guestName: 'Johnson Party', partySize: 7, startsAt: '2026-03-11T13:00:00Z', endsAt: '2026-03-11T15:30:00Z', notes: 'Birthday celebration', createdAt: '2026-03-10T10:00:00Z' },
  { id: 3, tableId: 9, guestName: 'Martinez', partySize: 2, startsAt: '2026-03-11T19:00:00Z', endsAt: '2026-03-11T21:30:00Z', notes: 'Anniversary dinner', createdAt: '2026-03-10T11:00:00Z' },
  { id: 4, tableId: 11, guestName: 'Chen Group', partySize: 4, startsAt: '2026-03-11T19:30:00Z', endsAt: '2026-03-11T22:00:00Z', notes: null, createdAt: '2026-03-10T12:00:00Z' },
];

interface LayoutState {
  floorPlan: FloorPlan;
  reservations: Reservation[];
  selectedTableId: number | null;
  recommendedTableIds: number[];
  hoveredTableId: number | null;
  isEditMode: boolean;
  tableStatuses: Record<number, TableStatus>;

  setFloorPlan: (fp: FloorPlan) => void;
  setReservations: (res: Reservation[]) => void;
  selectTable: (id: number | null) => void;
  setRecommended: (ids: number[]) => void;
  setHovered: (id: number | null) => void;
  setEditMode: (edit: boolean) => void;
  updateTable: (table: Table) => void;
  addTable: (table: Table) => void;
  removeTable: (id: number) => void;
  splitTable: (fusedId: number) => void;
  addArea: (area: Area) => void;
  updateArea: (area: Area) => void;
  removeArea: (id: number) => void;
  computeTableStatuses: (filterDate?: string, filterPartySize?: number) => void;
}

export const useLayoutStore = create<LayoutState>((set, get) => ({
  floorPlan: MOCK_FLOOR_PLAN,
  reservations: MOCK_RESERVATIONS,
  selectedTableId: null,
  recommendedTableIds: [],
  hoveredTableId: null,
  isEditMode: false,
  tableStatuses: {},

  setFloorPlan: (fp) => set({ floorPlan: fp }),
  setReservations: (res) => set({ reservations: res }),
  selectTable: (id) => set({ selectedTableId: id }),
  setRecommended: (ids) => set({ recommendedTableIds: ids }),
  setHovered: (id) => set({ hoveredTableId: id }),
  setEditMode: (edit) => set({ isEditMode: edit }),

  updateTable: (table) =>
    set((state) => ({
      floorPlan: {
        ...state.floorPlan,
        tables: state.floorPlan.tables.map((t) => (t.id === table.id ? table : t)),
      },
    })),

  addTable: (table) =>
    set((state) => ({
      floorPlan: {
        ...state.floorPlan,
        tables: [...state.floorPlan.tables, table],
      },
    })),

  removeTable: (id) =>
    set((state) => ({
      floorPlan: {
        ...state.floorPlan,
        tables: state.floorPlan.tables.filter((t) => t.id !== id),
      },
    })),

  splitTable: (fusedId) =>
    set((state) => ({
      floorPlan: {
        ...state.floorPlan,
        tables: state.floorPlan.tables
          // Remove the fused record
          .filter((t) => t.id !== fusedId)
          // Restore constituent tables: clear their parentFusedId
          .map((t) =>
            t.parentFusedId === fusedId
              ? { ...t, parentFusedId: null }
              : t
          ),
      },
    })),

  addArea: (area) =>
    set((state) => ({
      floorPlan: {
        ...state.floorPlan,
        areas: [...state.floorPlan.areas, area],
      },
    })),

  updateArea: (area) =>
    set((state) => ({
      floorPlan: {
        ...state.floorPlan,
        areas: state.floorPlan.areas.map((a) => (a.id === area.id ? area : a)),
      },
    })),

  removeArea: (id) =>
    set((state) => ({
      floorPlan: {
        ...state.floorPlan,
        areas: state.floorPlan.areas.filter((a) => a.id !== id),
      },
    })),

  computeTableStatuses: (filterDate?: string, filterPartySize?: number) => {
    const { floorPlan, reservations, selectedTableId, recommendedTableIds } = get();
    const statuses: Record<number, TableStatus> = {};

    const now = filterDate ? new Date(filterDate) : new Date();

    for (const table of floorPlan.tables) {
      if (selectedTableId === table.id) {
        statuses[table.id] = 'selected';
        continue;
      }
      if (recommendedTableIds.includes(table.id)) {
        statuses[table.id] = 'recommended';
        continue;
      }

      const hasOverlap = reservations.some(
        (r) => r.tableId === table.id && new Date(r.endsAt) > now && new Date(r.startsAt) <= now
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
