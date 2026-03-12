import type { Table } from '../types/layout';
import type { ScoredTable } from '../types/recommendation';

/**
 * Client-side scoring preview — mirrors the backend TableRecommenderService.
 * Used for fast mock recommendations before API integration.
 */
export function scoreTables(
  tables: Table[],
  partySize: number,
  preferredAreaId?: number
): ScoredTable[] {
  const results: ScoredTable[] = [];

  for (const table of tables) {
    if (table.capacity < partySize) continue;

    const waste = table.capacity - partySize;
    // Hard cutoff: don't recommend a table more than twice too large
    if (waste > partySize * 2) continue;

    const efficiencyScore = 1.0 - (waste / table.capacity) * 0.8;

    let areaPreferenceScore = 0.5;
    if (preferredAreaId !== undefined) {
      areaPreferenceScore = table.areaId === preferredAreaId ? 1.0 : 0.0;
    }

    const score = efficiencyScore * 0.65 + areaPreferenceScore * 0.35;
    if (score < 0.1) continue;

    const reason = buildReason(table, partySize, waste, preferredAreaId);

    results.push({ table, score, efficiencyScore, areaPreferenceScore, reason });
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 5);
}

function buildReason(table: Table, partySize: number, waste: number, preferredAreaId?: number): string {
  const fit =
    waste === 0
      ? `Perfect fit for ${partySize}`
      : `Seats ${partySize} of ${table.capacity} (${waste} spare)`;

  const area =
    preferredAreaId === undefined
      ? ''
      : table.areaId === preferredAreaId
      ? ' · Preferred area'
      : ' · Different area';

  return fit + area;
}
