import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Table } from '../types/layout';
import FloorPlan from '../components/floorplan/FloorPlan';
import FilterBar from '../components/filters/FilterBar';
import TableLegend from '../components/floorplan/TableLegend';
import BookingDrawer from '../components/reservation/BookingDrawer';
import TableDrawer from '../components/reservation/TableDrawer';
import { useLayoutStore } from '../store/layoutStore';
import * as layoutApi from '../api/layoutApi';
import * as reservationApi from '../api/reservationApi';

export default function MainPage() {
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [clickedTableId, setClickedTableId] = useState<number | undefined>();
  const [tableDrawerOpen, setTableDrawerOpen] = useState(false);
  const [clickedTable, setClickedTable] = useState<Table | undefined>();

  useEffect(() => {
    const { setFloorPlan, setReservations } = useLayoutStore.getState();
    Promise.all([layoutApi.getLayout(), reservationApi.getReservations({})])
      .then(([fp, reservations]) => {
        setFloorPlan(fp);
        setReservations(reservations);
      })
      .catch((err) => {
        console.error('Failed to load floor plan:', err);
      });
  }, []);

  const handleTableClick = (table: Table) => {
    setClickedTable(table);
    setTableDrawerOpen(true);
  };

  return (
    <div className="flex flex-col gap-4 p-6 flex-1">
      <div>
        <h1 className="font-display text-3xl font-semibold text-[#1c1917]">{t('page.floorPlan')}</h1>
        <p className="text-sm text-[#78716c] mt-0.5">{t('page.floorPlanSubtitle')}</p>
      </div>

      <FilterBar onNewReservation={() => { setClickedTableId(undefined); setDrawerOpen(true); }} />

      <TableLegend />

      <FloorPlan onTableClick={handleTableClick} />

      <BookingDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        initialTableId={clickedTableId}
      />

      <TableDrawer
        open={tableDrawerOpen}
        onClose={() => setTableDrawerOpen(false)}
        table={clickedTable}
      />
    </div>
  );
}
