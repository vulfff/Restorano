import { useState } from 'react';
import type { Table, TableStatus } from '../../types/layout';
import type { Reservation } from '../../types/reservation';
import TableTooltip from './TableTooltip';

interface Props {
  table: Table;
  status: TableStatus;
  reservations: Reservation[];
  recommendRank?: number;
  onClick?: (table: Table) => void;
}

const STATUS_STYLES: Record<TableStatus, string> = {
  available:    'bg-white border-2 border-[#b5d5c8] text-[#1c1917] hover:border-[#0f4c3a] hover:shadow-md cursor-pointer',
  reserved:     'bg-[#f5f2ee] border-2 border-[#d6d0c8] text-[#a8a29e] opacity-75 cursor-not-allowed',
  selected:     'bg-[#0f4c3a] border-2 border-[#0f4c3a] text-white shadow-lg cursor-pointer',
  recommended:  'bg-[#d97706] border-2 border-[#b45309] text-white shadow-lg cursor-pointer animate-pulse',
  unavailable:  'bg-[#fff1f2] border-2 border-[#fecdd3] text-[#e07070] opacity-60 cursor-not-allowed',
};

export default function TableCell({ table, status, reservations, recommendRank, onClick }: Props) {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleClick = () => {
    if (status === 'reserved' || status === 'unavailable') return;
    onClick?.(table);
  };

  return (
    <div
      style={{
        gridColumn: `${table.col} / span ${table.widthCells}`,
        gridRow: `${table.row} / span ${table.heightCells}`,
      }}
      className={`relative flex flex-col items-center justify-center rounded-lg transition-all duration-200 select-none m-0.5 ${STATUS_STYLES[status]}`}
      onClick={handleClick}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {recommendRank !== undefined && (
        <span className="absolute -top-2 -right-2 w-5 h-5 bg-amber-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center z-10">
          {recommendRank}
        </span>
      )}
      <span className="text-xs font-bold">{table.label}</span>
      <span className="text-[10px] opacity-70">{table.capacity}p</span>

      {showTooltip && (
        <TableTooltip
          reservations={reservations.filter((r) => r.tableIds.includes(table.id))}
          capacity={table.capacity}
          label={table.label}
        />
      )}
    </div>
  );
}
