import { useFilterStore } from '../../store/filterStore';
import { useLayoutStore } from '../../store/layoutStore';

interface Props {
  onNewReservation: () => void;
}

export default function FilterBar({ onNewReservation }: Props) {
  const { date, time, partySize, areaId, setDate, setTime, setPartySize, setAreaId, reset } = useFilterStore();
  const { floorPlan } = useLayoutStore();

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex flex-wrap gap-3 items-end">
      {/* Date */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-500">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* Time */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-500">Time</label>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* Party size */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-500">Party size</label>
        <input
          type="number"
          min={1}
          max={20}
          placeholder="Any"
          value={partySize}
          onChange={(e) => setPartySize(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* Area */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-500">Area</label>
        <select
          value={areaId}
          onChange={(e) => setAreaId(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">All areas</option>
          {floorPlan.areas.map((area) => (
            <option key={area.id} value={area.id}>{area.name}</option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div className="flex gap-2 ml-auto">
        <button
          onClick={reset}
          className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Reset
        </button>
        <button
          onClick={onNewReservation}
          className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          + New Reservation
        </button>
      </div>
    </div>
  );
}
