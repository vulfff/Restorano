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
  available:    'bg-white border-2 border-slate-300 text-slate-700 hover:border-blue-400 hover:shadow-md cursor-pointer',
  reserved:     'bg-slate-100 border-2 border-slate-300 text-slate-400 opacity-70 cursor-not-allowed',
  selected:     'bg-blue-500 border-2 border-blue-600 text-white shadow-lg cursor-pointer',
  recommended:  'bg-amber-400 border-2 border-amber-500 text-white shadow-lg cursor-pointer animate-pulse',
  unavailable:  'bg-red-50 border-2 border-red-200 text-red-300 opacity-60 cursor-not-allowed',
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
