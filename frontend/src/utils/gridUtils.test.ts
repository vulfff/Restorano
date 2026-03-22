import { describe, it, expect } from 'vitest';
import { isOccupied, getTableAt, cellsInRect } from './gridUtils';
import type { Table } from '../types/layout';

function makeTable(id: number, col: number, row: number, w: number, h: number): Table {
  return {
    id, label: `T${id}`, capacity: 4,
    col, row, widthCells: w, heightCells: h,
    areaId: null, isFused: false, fusedTableIds: null,
  };
}

describe('isOccupied', () => {
  const table = makeTable(1, 3, 3, 2, 2); // occupies cols 3-4, rows 3-4

  it('returns true for a cell inside the table', () => {
    expect(isOccupied([table], 3, 3)).toBe(true);
    expect(isOccupied([table], 4, 4)).toBe(true);
  });

  it('returns false for a cell outside all tables', () => {
    expect(isOccupied([table], 2, 3)).toBe(false);
    expect(isOccupied([table], 5, 3)).toBe(false);
  });

  it('returns false when the table is excluded by id', () => {
    expect(isOccupied([table], 3, 3, 1)).toBe(false);
  });

  it('returns false for the cell just past the right edge (exclusive upper bound)', () => {
    // col = col + widthCells = 3 + 2 = 5 → NOT occupied
    expect(isOccupied([table], 5, 3)).toBe(false);
  });

  it('returns false for the cell just past the bottom edge (exclusive upper bound)', () => {
    // row = row + heightCells = 3 + 2 = 5 → NOT occupied
    expect(isOccupied([table], 3, 5)).toBe(false);
  });
});

describe('getTableAt', () => {
  const tableA = makeTable(1, 1, 1, 2, 1); // cols 1-2, row 1
  const tableB = makeTable(2, 4, 4, 1, 1); // col 4, row 4

  it('returns the correct table when the cell is inside it', () => {
    expect(getTableAt([tableA, tableB], 2, 1)).toBe(tableA);
    expect(getTableAt([tableA, tableB], 4, 4)).toBe(tableB);
  });

  it('returns undefined when no table covers the cell', () => {
    expect(getTableAt([tableA, tableB], 3, 3)).toBeUndefined();
  });
});

describe('cellsInRect', () => {
  it('returns a single cell for identical corners', () => {
    const cells = cellsInRect(2, 2, 2, 2);
    expect(cells).toHaveLength(1);
    expect(cells[0]).toEqual({ col: 2, row: 2 });
  });

  it('returns 6 cells for a 2-wide × 3-tall rect', () => {
    const cells = cellsInRect(1, 1, 2, 3);
    expect(cells).toHaveLength(6);
  });

  it('contains all expected cells for a 2×2 rect', () => {
    const cells = cellsInRect(1, 1, 2, 2);
    expect(cells).toContainEqual({ col: 1, row: 1 });
    expect(cells).toContainEqual({ col: 1, row: 2 });
    expect(cells).toContainEqual({ col: 2, row: 1 });
    expect(cells).toContainEqual({ col: 2, row: 2 });
  });

  it('handles reversed corners (c2 < c1, r2 < r1)', () => {
    const forward = cellsInRect(1, 1, 3, 3);
    const reversed = cellsInRect(3, 3, 1, 1);
    expect(reversed).toHaveLength(forward.length);
    // Same cells regardless of corner order
    forward.forEach(cell => expect(reversed).toContainEqual(cell));
  });
});
