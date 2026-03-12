import type { Table } from './layout';

export interface ScoredTable {
  table: Table;
  score: number;              // 0.0 - 1.0 composite
  efficiencyScore: number;
  areaPreferenceScore: number;
  reason: string;             // human-readable explanation
}

export interface RecommendRequest {
  partySize: number;
  preferredAreaId?: number;
  startsAt: string;           // ISO 8601
  durationHours?: number;     // defaults to 2.5
}
