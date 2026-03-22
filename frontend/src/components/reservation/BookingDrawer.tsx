import { useState, useEffect } from 'react';
import { useLayoutStore } from '../../store/layoutStore';
import { useFilterStore } from '../../store/filterStore';
import type { ScoredTable } from '../../types/recommendation';
import * as reservationApi from '../../api/reservationApi';
import RecommendedTables from './RecommendedTables';
import MealSuggestions from './MealSuggestions';
import { useTranslation } from 'react-i18next';

interface Props {
  open: boolean;
  onClose: () => void;
  initialTableId?: number;
}

export default function BookingDrawer({ open, onClose, initialTableId }: Props) {
  const { floorPlan, selectTable, setRecommended } = useLayoutStore();
  const { date, areaId } = useFilterStore();
  const { t } = useTranslation();

  const [guestName, setGuestName] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [preferredAreaId, setPreferredAreaId] = useState<number | ''>(areaId);
  const [bookDate, setBookDate] = useState(date);
  const [bookTime, setBookTime] = useState('19:00');
  const [selectedTableId, setSelectedTableId] = useState<number | undefined>(initialTableId);
  const [scored, setScored] = useState<ScoredTable[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [notes, setNotes] = useState('');
  const [bookingError, setBookingError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setConfirmed(false);
      setScored([]);
      setSelectedTableId(initialTableId);
      setBookingError(null);
    }
  }, [open, initialTableId]);

  const handleFindTables = async () => {
    try {
      const startsAt = new Date(`${bookDate}T${bookTime}`).toISOString();
      const results = await reservationApi.recommend({
        partySize,
        preferredAreaId: preferredAreaId !== '' ? preferredAreaId : undefined,
        startsAt,
      });
      setScored(results);
      setRecommended(results.map((s) => s.table.id));
    } catch {
      // Keep empty results on error
      setScored([]);
      setRecommended([]);
    }
  };

  const handleSelectTable = (tableId: number) => {
    setSelectedTableId(tableId);
    selectTable(tableId);
  };

  const handleConfirm = async () => {
    if (!selectedTableId || !guestName.trim()) return;
    try {
      await reservationApi.createReservation({
        tableIds: [selectedTableId],
        guestName: guestName.trim(),
        partySize,
        startsAt: new Date(`${bookDate}T${bookTime}`).toISOString(),
        notes: notes.trim() || undefined,
      });
      // Refresh reservations in the store after successful booking
      const freshReservations = await reservationApi.getReservations({});
      useLayoutStore.getState().setReservations(freshReservations);
      setConfirmed(true);
      setRecommended([]);
      selectTable(null);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string } } };
      if (axiosErr?.response?.status === 409) {
        setBookingError(t('booking.errorConflict'));
      } else {
        setBookingError(t('booking.errorGeneric'));
      }
    }
  };

  const handleClose = () => {
    setRecommended([]);
    selectTable(null);
    setScored([]);
    onClose();
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-30 transition-opacity"
        onClick={handleClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-40 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#e8e3db] bg-white">
          <h2 className="font-display text-xl font-semibold text-[#1c1917]">{t('booking.title')}</h2>
          <button
            onClick={handleClose}
            className="text-[#a8a29e] hover:text-[#1c1917] text-2xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {confirmed ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">✓</div>
              <h3 className="font-display text-2xl font-semibold text-[#0f4c3a] mb-2">{t('booking.confirmedTitle')}</h3>
              <p className="text-[#78716c]">
                {t('booking.confirmedSubtitle', { guestName, partySize })}<br />
                {bookDate} at {bookTime}
              </p>
              <button
                onClick={handleClose}
                className="mt-6 px-6 py-2 bg-[#0f4c3a] text-white rounded-lg hover:bg-[#1a6b52] transition-colors"
              >
                {t('booking.done')}
              </button>
            </div>
          ) : (
            <>
              {/* Guest name */}
              <div className="mb-3">
                <label className="text-xs font-medium text-[#78716c] block mb-1">{t('booking.guestName')}</label>
                <input
                  type="text"
                  placeholder={t('booking.guestNamePlaceholder')}
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full border border-[#e8e3db] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c3a]"
                />
              </div>

              {/* Party size */}
              <div className="mb-3">
                <label className="text-xs font-medium text-[#78716c] block mb-1">{t('booking.partySize')}</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={partySize}
                  onChange={(e) => setPartySize(parseInt(e.target.value, 10))}
                  className="w-full border border-[#e8e3db] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c3a]"
                />
              </div>

              {/* Date and time */}
              <div className="flex gap-2 mb-3">
                <div className="flex-1">
                  <label className="text-xs font-medium text-[#78716c] block mb-1">{t('booking.date')}</label>
                  <input
                    type="date"
                    value={bookDate}
                    onChange={(e) => setBookDate(e.target.value)}
                    className="w-full border border-[#e8e3db] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c3a]"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-[#78716c] block mb-1">{t('booking.time')}</label>
                  <input
                    type="time"
                    value={bookTime}
                    onChange={(e) => setBookTime(e.target.value)}
                    className="w-full border border-[#e8e3db] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c3a]"
                  />
                </div>
              </div>

              {/* Preferred area */}
              <div className="mb-4">
                <label className="text-xs font-medium text-[#78716c] block mb-1">{t('booking.preferredArea')}</label>
                <select
                  value={preferredAreaId}
                  onChange={(e) => setPreferredAreaId(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                  className="w-full border border-[#e8e3db] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c3a]"
                >
                  <option value="">{t('booking.noPreference')}</option>
                  {floorPlan.areas.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div className="mb-4">
                <label className="text-xs font-medium text-[#78716c] block mb-1">{t('booking.notes')}</label>
                <textarea
                  rows={2}
                  placeholder={t('booking.notesPlaceholder')}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-[#e8e3db] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c3a] resize-none"
                />
              </div>

              {/* Find tables button */}
              <button
                onClick={handleFindTables}
                className="w-full py-2.5 bg-[#1c1917] text-white rounded-lg hover:bg-[#3c3830] font-medium text-sm transition-colors"
              >
                {t('booking.findTables')}
              </button>

              {/* Recommendations */}
              <RecommendedTables
                scored={scored}
                onSelect={handleSelectTable}
                selectedTableId={selectedTableId}
              />

              {/* Meal suggestions */}
              <MealSuggestions />
            </>
          )}
        </div>

        {/* Footer */}
        {!confirmed && (
          <div className="border-t border-[#e8e3db] p-4 bg-white">
            <button
              onClick={handleConfirm}
              disabled={!selectedTableId || !guestName.trim()}
              className="w-full py-3 bg-[#0f4c3a] text-white rounded-lg hover:bg-[#1a6b52] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t('booking.confirm')}
            </button>
            {!selectedTableId && scored.length > 0 && (
              <p className="text-xs text-[#a8a29e] text-center mt-2">{t('booking.selectTableHint')}</p>
            )}
            {bookingError && (
              <p className="text-xs text-red-500 text-center mt-2">{bookingError}</p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
