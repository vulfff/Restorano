export interface GridPosition {
  col: number;
  row: number;
}

export interface Area {
  id: number;
  name: string;        // "Indoors", "Balcony", "Terrace"
  color: string;       // CSS hex color for the background fill
  topLeftCol: number;
  topLeftRow: number;
  bottomRightCol: number;
  bottomRightRow: number;
}

export type TableStatus = 'available' | 'reserved' | 'selected' | 'recommended' | 'unavailable';

export interface Table {
  id: number;
  label: string;           // "T1", "T2"
  capacity: number;
  col: number;
  row: number;
  widthCells: number;      // 1 for a standard table, 2+ for fused
  heightCells: number;
  areaId: number | null;
  isFused: boolean;
  fusedTableIds: number[] | null;
  parentFusedId?: number | null;  // set on constituent tables when fused; hides them from render
  status?: TableStatus;    // computed client-side; not stored
}

export interface FloorPlan {
  id: number;
  gridCols: number;
  gridRows: number;
  areas: Area[];
  tables: Table[];
}
