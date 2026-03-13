import { useEffect } from 'react';
import type { Table } from '../../types/layout';
import { useLayoutStore } from '../../store/layoutStore';
import { useFilterStore } from '../../store/filterStore';
import AreaRect from './AreaRect';
import TableCell from './TableCell';

const CELL_SIZE = 60; // px per grid cell

interface Props {
  onTableClick?: (table: Table) => void;
}

export default function FloorPlan({ onTableClick }: Props) {
  const { floorPlan, reservations, tableStatuses, recommendedTableIds, computeTableStatuses } = useLayoutStore();
  const { partySize } = useFilterStore();

  useEffect(() => {
    computeTableStatuses(undefined, partySize !== '' ? partySize : undefined);
  }, [reservations, recommendedTableIds, partySize, computeTableStatuses]);

  const gridWidth = floorPlan.gridCols * CELL_SIZE;
  const gridHeight = floorPlan.gridRows * CELL_SIZE;

  return (
    <div className="overflow-auto rounded-2xl border border-[#e8e3db] bg-[#f9f7f4] shadow-inner p-4">
      <div
        className="relative"
        style={{ width: gridWidth, height: gridHeight }}
      >
        {/* Area backgrounds */}
        {floorPlan.areas.map((area) => (
          <AreaRect key={area.id} area={area} cellSize={CELL_SIZE} />
        ))}

        {/* Tables on CSS Grid overlay */}
        <div
          className="absolute inset-0"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${floorPlan.gridCols}, ${CELL_SIZE}px)`,
            gridTemplateRows: `repeat(${floorPlan.gridRows}, ${CELL_SIZE}px)`,
          }}
        >
          {floorPlan.tables.filter((t) => !t.parentFusedId).map((table) => {
            const status = tableStatuses[table.id] ?? 'available';
            const rankIndex = recommendedTableIds.indexOf(table.id);
            return (
              <TableCell
                key={table.id}
                table={table}
                status={status}
                reservations={reservations}
                recommendRank={rankIndex >= 0 ? rankIndex + 1 : undefined}
                onClick={onTableClick}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
