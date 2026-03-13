import { useFilterStore } from '../../store/filterStore';
import { useLayoutStore } from '../../store/layoutStore';

interface Props {
  onNewReservation: () => void;
}

export default function FilterBar({ onNewReservation }: Props) {
  const { date, time, partySize, areaId, setDate, setTime, setPartySize, setAreaId, reset } = useFilterStore();
  const { floorPlan } = useLayoutStore();

  return (
    <div className="bg-white border border-[#e8e3db] rounded-xl p-4 flex flex-wrap gap-3 items-end">
      {/* Date */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium uppercase tracking-wide text-[#78716c]">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border border-[#e8e3db] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c3a]"
        />
      </div>

      {/* Time */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium uppercase tracking-wide text-[#78716c]">Time</label>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="border border-[#e8e3db] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c3a]"
        />
      </div>

      {/* Party size */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium uppercase tracking-wide text-[#78716c]">Party size</label>
        <input
          type="number"
          min={1}
          max={20}
          placeholder="Any"
          value={partySize}
          onChange={(e) => setPartySize(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
          className="border border-[#e8e3db] rounded-lg px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-[#0f4c3a]"
        />
      </div>

      {/* Area */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium uppercase tracking-wide text-[#78716c]">Area</label>
        <select
          value={areaId}
          onChange={(e) => setAreaId(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
          className="border border-[#e8e3db] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c3a]"
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
          className="px-4 py-2 text-sm text-[#78716c] border border-[#e8e3db] rounded-lg hover:bg-[#f9f7f4] transition-colors"
        >
          Reset
        </button>
        <button
          onClick={onNewReservation}
          className="px-4 py-2 text-sm font-medium bg-[#0f4c3a] text-white rounded-lg hover:bg-[#1a6b52] transition-colors"
        >
          + New Reservation
        </button>
      </div>
    </div>
  );
}
