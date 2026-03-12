import type { Reservation } from '../../types/reservation';
import { format, parseISO } from 'date-fns';

interface Props {
  reservations: Reservation[];
  capacity: number;
  label: string;
}

export default function TableTooltip({ reservations, capacity, label }: Props) {
  const upcoming = reservations
    .filter((r) => new Date(r.endsAt) > new Date())
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .slice(0, 3);

  return (
    <div className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 w-52 bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs pointer-events-none">
      <div className="font-semibold text-slate-700 mb-1 border-b pb-1">
        {label} — {capacity} seats
      </div>
      {upcoming.length === 0 ? (
        <div className="text-slate-400 italic">No upcoming reservations</div>
      ) : (
        upcoming.map((r) => (
          <div key={r.id} className="mt-1.5">
            <div className="font-medium text-slate-800">{r.guestName}</div>
            <div className="text-slate-500">
              {format(parseISO(r.startsAt), 'HH:mm')} – {format(parseISO(r.endsAt), 'HH:mm')} · {r.partySize} pax
            </div>
            {r.notes && <div className="text-slate-400 italic truncate">{r.notes}</div>}
          </div>
        ))
      )}
    </div>
  );
}
