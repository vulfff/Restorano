import { create } from 'zustand';
import type { FloorPlan, Table, Area, TableStatus } from '../types/layout';
import type { Reservation } from '../types/reservation';

const EMPTY_FLOOR_PLAN: FloorPlan = { id: 1, gridCols: 20, gridRows: 14, areas: [], tables: [] };

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
  floorPlan: EMPTY_FLOOR_PLAN,
  reservations: [],
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
        (r) => r.tableIds.includes(table.id) && new Date(r.endsAt) > now && new Date(r.startsAt) <= now
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
