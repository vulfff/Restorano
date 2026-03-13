import { useState } from 'react';
import type { Table } from '../types/layout';
import FloorPlan from '../components/floorplan/FloorPlan';
import FilterBar from '../components/filters/FilterBar';
import TableLegend from '../components/floorplan/TableLegend';
import BookingDrawer from '../components/reservation/BookingDrawer';

export default function MainPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [clickedTableId, setClickedTableId] = useState<number | undefined>();

  const handleTableClick = (table: Table) => {
    setClickedTableId(table.id);
    setDrawerOpen(true);
  };

  return (
    <div className="flex flex-col gap-4 p-6 flex-1">
      <div>
        <h1 className="font-display text-3xl font-semibold text-[#1c1917]">Floor Plan</h1>
        <p className="text-sm text-[#78716c] mt-0.5">View tables and manage reservations</p>
      </div>

      <FilterBar onNewReservation={() => { setClickedTableId(undefined); setDrawerOpen(true); }} />

      <TableLegend />

      <FloorPlan onTableClick={handleTableClick} />

      <BookingDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        initialTableId={clickedTableId}
      />
    </div>
  );
}
