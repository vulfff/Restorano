import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Table } from '../../types/layout';
import type { Reservation } from '../../types/reservation';
import { useLayoutStore } from '../../store/layoutStore';
import { useFilterStore } from '../../store/filterStore';
import * as reservationApi from '../../api/reservationApi';
import MealSuggestions from './MealSuggestions';

interface Props {
  open: boolean;
  onClose: () => void;
  table: Table | undefined;
}

interface RowState {
  editing: boolean;
  guestName: string;
  partySize: number;
  date: string;
  time: string;
  notes: string;
  error: string | null;
  deleteError: string | null;
}

function toDateStr(iso: string) {
  return iso.slice(0, 10);
}
function toTimeStr(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}
function initRow(r: Reservation): RowState {
  return {
    editing: false,
    guestName: r.guestName,
    partySize: r.partySize,
    date: toDateStr(r.startsAt),
    time: toTimeStr(r.startsAt),
    notes: r.notes ?? '',
    error: null,
    deleteError: null,
  };
}

export default function TableDrawer({ open, onClose, table }: Props) {
  const { t } = useTranslation();
  const { date: filterDate } = useFilterStore();

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rowStates, setRowStates] = useState<Record<number, RowState>>({});

  // New booking form state
  const [guestName, setGuestName] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [bookDate, setBookDate] = useState(filterDate);
  const [bookTime, setBookTime] = useState('19:00');
  const [notes, setNotes] = useState('');
  const [bookError, setBookError] = useState<string | null>(null);
  const [bookSuccess, setBookSuccess] = useState(false);

  const refreshReservations = async (tableId: number) => {
    const data = await reservationApi.getReservationsForTable(tableId);
    setReservations(data);
    setRowStates(Object.fromEntries(data.map((r) => [r.id, initRow(r)])));
    // Refresh global store
    const fresh = await reservationApi.getReservations({});
    useLayoutStore.getState().setReservations(fresh);
  };

  useEffect(() => {
    if (open && table) {
      refreshReservations(table.id);
      setGuestName('');
      setPartySize(2);
      setBookDate(filterDate);
      setBookTime('19:00');
      setNotes('');
      setBookError(null);
      setBookSuccess(false);
    }
  }, [open, table]);

  const setRow = (id: number, patch: Partial<RowState>) =>
    setRowStates((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const handleEdit = (id: number) => setRow(id, { editing: true, error: null });
  const handleCancel = (id: number, r: Reservation) => setRow(id, initRow(r));

  const handleSave = async (r: Reservation) => {
    const row = rowStates[r.id];
    if (!row) return;
    try {
      await reservationApi.updateReservation(r.id, {
        guestName: row.guestName.trim(),
        partySize: row.partySize,
        startsAt: new Date(`${row.date}T${row.time}`).toISOString(),
        notes: row.notes.trim() || undefined,
      });
      await refreshReservations(table!.id);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number } };
      const msg = axiosErr?.response?.status === 409
        ? t('tableDrawer.errorSaveConflict')
        : t('tableDrawer.errorSave');
      setRow(r.id, { error: msg });
    }
  };

  const handleDelete = async (r: Reservation) => {
    try {
      await reservationApi.deleteReservation(r.id);
      await refreshReservations(table!.id);
    } catch {
      setRow(r.id, { deleteError: t('tableDrawer.errorDelete') });
    }
  };

  const handleBook = async () => {
    if (!table || !guestName.trim()) return;
    setBookError(null);
    try {
      await reservationApi.createReservation({
        tableIds: [table.id],
        guestName: guestName.trim(),
        partySize,
        startsAt: new Date(`${bookDate}T${bookTime}`).toISOString(),
        notes: notes.trim() || undefined,
      });
      await refreshReservations(table.id);
      setGuestName('');
      setNotes('');
      setBookSuccess(true);
      setTimeout(() => setBookSuccess(false), 3000);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number } };
      setBookError(axiosErr?.response?.status === 409
        ? t('tableDrawer.errorBookConflict')
        : t('tableDrawer.errorBook'));
    }
  };

  if (!open || !table) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-30 transition-opacity" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-40 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#e8e3db] bg-white">
          <h2 className="font-display text-xl font-semibold text-[#1c1917]">
            {t('tableDrawer.title', { label: table.label })}
          </h2>
          <button onClick={onClose} className="text-[#a8a29e] hover:text-[#1c1917] text-2xl leading-none transition-colors">
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* Section A — Upcoming Reservations */}
          <section>
            <h3 className="text-sm font-semibold text-[#1c1917] mb-3 uppercase tracking-wide">
              {t('tableDrawer.upcomingTitle')}
            </h3>

            {reservations.length === 0 ? (
              <p className="text-sm text-[#a8a29e]">{t('tableDrawer.emptyState')}</p>
            ) : (
              <ul className="space-y-2">
                {reservations.map((r) => {
                  const row = rowStates[r.id];
                  if (!row) return null;
                  return (
                    <li key={r.id} className="border border-[#e8e3db] rounded-lg p-3 bg-[#f9f7f4]">
                      {!row.editing ? (
                        <>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[#1c1917] truncate">{r.guestName}</p>
                              <p className="text-xs text-[#78716c]">
                                {t('tableDrawer.guests', { count: r.partySize })} · {toDateStr(r.startsAt)} {toTimeStr(r.startsAt)}
                              </p>
                              {r.notes && (
                                <p className="text-xs text-[#a8a29e] truncate mt-0.5">{r.notes}</p>
                              )}
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <button
                                onClick={() => handleEdit(r.id)}
                                className="text-xs px-2 py-1 rounded bg-[#e8e3db] hover:bg-[#d6d0c8] text-[#1c1917] transition-colors"
                              >
                                {t('tableDrawer.edit')}
                              </button>
                              <button
                                onClick={() => handleDelete(r)}
                                className="text-xs px-2 py-1 rounded bg-red-100 hover:bg-red-200 text-red-700 transition-colors"
                              >
                                {t('tableDrawer.delete')}
                              </button>
                            </div>
                          </div>
                          {row.deleteError && (
                            <p className="text-xs text-red-500 mt-1">{row.deleteError}</p>
                          )}
                        </>
                      ) : (
                        <div className="space-y-2">
                          <div>
                            <label className="text-xs font-medium text-[#78716c] block mb-0.5">{t('tableDrawer.guestName')}</label>
                            <input
                              type="text"
                              value={row.guestName}
                              onChange={(e) => setRow(r.id, { guestName: e.target.value })}
                              className="w-full border border-[#e8e3db] rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c3a]"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-[#78716c] block mb-0.5">{t('tableDrawer.partySize')}</label>
                            <input
                              type="number"
                              min={1}
                              max={20}
                              value={row.partySize}
                              onChange={(e) => setRow(r.id, { partySize: parseInt(e.target.value, 10) })}
                              className="w-full border border-[#e8e3db] rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c3a]"
                            />
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="text-xs font-medium text-[#78716c] block mb-0.5">{t('tableDrawer.date')}</label>
                              <input
                                type="date"
                                value={row.date}
                                onChange={(e) => setRow(r.id, { date: e.target.value })}
                                className="w-full border border-[#e8e3db] rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c3a]"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-xs font-medium text-[#78716c] block mb-0.5">{t('tableDrawer.time')}</label>
                              <input
                                type="time"
                                value={row.time}
                                onChange={(e) => setRow(r.id, { time: e.target.value })}
                                className="w-full border border-[#e8e3db] rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c3a]"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-[#78716c] block mb-0.5">{t('tableDrawer.notes')}</label>
                            <textarea
                              rows={2}
                              value={row.notes}
                              onChange={(e) => setRow(r.id, { notes: e.target.value })}
                              className="w-full border border-[#e8e3db] rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c3a] resize-none"
                            />
                          </div>
                          {row.error && <p className="text-xs text-red-500">{row.error}</p>}
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => handleSave(r)}
                              className="flex-1 py-1.5 text-sm bg-[#0f4c3a] text-white rounded hover:bg-[#1a6b52] transition-colors"
                            >
                              {t('tableDrawer.save')}
                            </button>
                            <button
                              onClick={() => handleCancel(r.id, r)}
                              className="flex-1 py-1.5 text-sm bg-[#e8e3db] text-[#1c1917] rounded hover:bg-[#d6d0c8] transition-colors"
                            >
                              {t('tableDrawer.cancel')}
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Divider */}
          <hr className="border-[#e8e3db]" />

          {/* Section B — New Reservation */}
          <section>
            <h3 className="text-sm font-semibold text-[#1c1917] mb-3 uppercase tracking-wide">
              {t('tableDrawer.newTitle')}
            </h3>

            {/* Locked table badge */}
            <div className="mb-3 px-3 py-2 bg-[#f0fdf4] border border-[#b5d5c8] rounded-lg text-sm text-[#0f4c3a] font-medium">
              {t('tableDrawer.tableBadge', { label: table.label, capacity: table.capacity })}
            </div>

            <div className="mb-3">
              <label className="text-xs font-medium text-[#78716c] block mb-1">{t('tableDrawer.guestName')}</label>
              <input
                type="text"
                placeholder={t('tableDrawer.guestNamePlaceholder')}
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full border border-[#e8e3db] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c3a]"
              />
            </div>

            <div className="mb-3">
              <label className="text-xs font-medium text-[#78716c] block mb-1">{t('tableDrawer.partySize')}</label>
              <input
                type="number"
                min={1}
                max={20}
                value={partySize}
                onChange={(e) => setPartySize(parseInt(e.target.value, 10))}
                className="w-full border border-[#e8e3db] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c3a]"
              />
            </div>

            <div className="flex gap-2 mb-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-[#78716c] block mb-1">{t('tableDrawer.date')}</label>
                <input
                  type="date"
                  value={bookDate}
                  onChange={(e) => setBookDate(e.target.value)}
                  className="w-full border border-[#e8e3db] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c3a]"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-[#78716c] block mb-1">{t('tableDrawer.time')}</label>
                <input
                  type="time"
                  value={bookTime}
                  onChange={(e) => setBookTime(e.target.value)}
                  className="w-full border border-[#e8e3db] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c3a]"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="text-xs font-medium text-[#78716c] block mb-1">{t('tableDrawer.notes')}</label>
              <textarea
                rows={2}
                placeholder={t('tableDrawer.notesPlaceholder')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border border-[#e8e3db] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c3a] resize-none"
              />
            </div>

            <MealSuggestions />
          </section>
        </div>

        {/* Footer — Book button */}
        <div className="border-t border-[#e8e3db] p-4 bg-white">
          <button
            onClick={handleBook}
            disabled={!guestName.trim()}
            className="w-full py-3 bg-[#0f4c3a] text-white rounded-lg hover:bg-[#1a6b52] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t('tableDrawer.book')}
          </button>
          {bookError && <p className="text-xs text-red-500 text-center mt-2">{bookError}</p>}
          {bookSuccess && <p className="text-xs text-green-600 text-center mt-2">{t('tableDrawer.bookedSuccess')}</p>}
        </div>
      </div>
    </>
  );
}
