import type { Table } from '../types/layout';

export function isOccupied(tables: Table[], col: number, row: number, excludeId?: number): boolean {
  return tables.some((t) => {
    if (t.id === excludeId) return false;
    return (
      col >= t.col &&
      col < t.col + t.widthCells &&
      row >= t.row &&
      row < t.row + t.heightCells
    );
  });
}

export function getTableAt(tables: Table[], col: number, row: number): Table | undefined {
  return tables.find(
    (t) =>
      col >= t.col &&
      col < t.col + t.widthCells &&
      row >= t.row &&
      row < t.row + t.heightCells
  );
}

export function cellsInRect(
  c1: number, r1: number,
  c2: number, r2: number
): Array<{ col: number; row: number }> {
  const cells = [];
  const minCol = Math.min(c1, c2);
  const maxCol = Math.max(c1, c2);
  const minRow = Math.min(r1, r2);
  const maxRow = Math.max(r1, r2);
  for (let c = minCol; c <= maxCol; c++) {
    for (let r = minRow; r <= maxRow; r++) {
      cells.push({ col: c, row: r });
    }
  }
  return cells;
}
