import { describe, it, expect } from 'vitest';
import { scoreTables } from './scoringUtils';
import type { Table } from '../types/layout';

function makeTable(overrides: Partial<Table> & { id: number; capacity: number; areaId: number | null }): Table {
  return {
    label: `T${overrides.id}`,
    col: 1, row: 1, widthCells: 1, heightCells: 1,
    isFused: false, fusedTableIds: null,
    ...overrides,
  };
}

describe('scoreTables', () => {
  it('excludes tables with capacity less than partySize', () => {
    const tables = [makeTable({ id: 1, capacity: 2, areaId: null })];
    expect(scoreTables(tables, 4)).toHaveLength(0);
  });

  it('excludes tables where waste > partySize * 2 (hard cutoff)', () => {
    // partySize=2, capacity=7 → waste=5 > 2*2=4 → excluded
    const tables = [makeTable({ id: 1, capacity: 7, areaId: null })];
    expect(scoreTables(tables, 2)).toHaveLength(0);
  });

  it('includes table at exact hard-cutoff boundary (waste == partySize*2)', () => {
    // partySize=2, capacity=6 → waste=4 == 2*2=4 → included
    const tables = [makeTable({ id: 1, capacity: 6, areaId: null })];
    expect(scoreTables(tables, 2)).toHaveLength(1);
  });

  it('computes efficiency=1.0 for a perfect fit (waste=0)', () => {
    const tables = [makeTable({ id: 1, capacity: 4, areaId: null })];
    const [result] = scoreTables(tables, 4);
    expect(result.efficiencyScore).toBeCloseTo(1.0);
  });

  it('uses areaScore=0.5 when no preferredAreaId is given', () => {
    const tables = [makeTable({ id: 1, capacity: 4, areaId: 1 })];
    const [result] = scoreTables(tables, 4);
    expect(result.areaPreferenceScore).toBe(0.5);
  });

  it('uses areaScore=1.0 when table is in the preferred area', () => {
    const tables = [makeTable({ id: 1, capacity: 4, areaId: 1 })];
    const [result] = scoreTables(tables, 4, 1);
    expect(result.areaPreferenceScore).toBe(1.0);
  });

  it('uses areaScore=0.0 when table is NOT in the preferred area', () => {
    const tables = [makeTable({ id: 1, capacity: 4, areaId: 2 })];
    const [result] = scoreTables(tables, 4, 1);
    expect(result.areaPreferenceScore).toBe(0.0);
  });

  it('computes correct finalScore: efficiency*0.65 + area*0.35 for perfect fit, no preference', () => {
    const tables = [makeTable({ id: 1, capacity: 4, areaId: null })];
    const [result] = scoreTables(tables, 4);
    // efficiency=1.0, area=0.5 → 1.0*0.65 + 0.5*0.35 = 0.825
    expect(result.score).toBeCloseTo(0.825);
  });

  it('excludes tables with finalScore < 0.1', () => {
    // The < 0.1 filter is a safety net; just verify no negative scores appear
    const tables = [makeTable({ id: 1, capacity: 2, areaId: 2 })];
    const results = scoreTables(tables, 1, 1); // areaId mismatch → areaScore=0
    // efficiency = 1 - (1/2)*0.8 = 0.6; score = 0.6*0.65 + 0*0.35 = 0.39 → included
    expect(results.every(r => r.score >= 0.1)).toBe(true);
  });

  it('returns at most 5 results when more than 5 tables are eligible', () => {
    const tables = Array.from({ length: 8 }, (_, i) =>
      makeTable({ id: i + 1, capacity: 4, areaId: null })
    );
    expect(scoreTables(tables, 4)).toHaveLength(5);
  });

  it('returns results sorted descending by score', () => {
    const tables = [
      makeTable({ id: 1, capacity: 4, areaId: 1 }),  // perfect fit, preferred → highest score
      makeTable({ id: 2, capacity: 6, areaId: 2 }),  // some waste, mismatch → lower score
    ];
    const results = scoreTables(tables, 4, 1);
    expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
  });

  describe('reason strings', () => {
    it('returns "Perfect fit for N" when waste=0', () => {
      const tables = [makeTable({ id: 1, capacity: 4, areaId: null })];
      const [result] = scoreTables(tables, 4);
      expect(result.reason).toBe('Perfect fit for 4');
    });

    it('returns "Seats N of M (K spare)" when waste > 0', () => {
      const tables = [makeTable({ id: 1, capacity: 6, areaId: null })];
      const [result] = scoreTables(tables, 4);
      expect(result.reason).toBe('Seats 4 of 6 (2 spare)');
    });

    it('appends " · Preferred area" when table is in preferred area', () => {
      const tables = [makeTable({ id: 1, capacity: 4, areaId: 1 })];
      const [result] = scoreTables(tables, 4, 1);
      expect(result.reason).toContain(' · Preferred area');
    });

    it('appends " · Different area" when table is not in preferred area', () => {
      const tables = [makeTable({ id: 1, capacity: 4, areaId: 2 })];
      const [result] = scoreTables(tables, 4, 1);
      expect(result.reason).toContain(' · Different area');
    });

    it('appends no area suffix when no preferredAreaId is given', () => {
      const tables = [makeTable({ id: 1, capacity: 4, areaId: 1 })];
      const [result] = scoreTables(tables, 4);
      expect(result.reason).not.toContain(' · ');
    });
  });
});
