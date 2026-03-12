import type { ScoredTable } from '../../types/recommendation';
import { useLayoutStore } from '../../store/layoutStore';

interface Props {
  scored: ScoredTable[];
  onSelect: (tableId: number) => void;
  selectedTableId?: number;
}

export default function RecommendedTables({ scored, onSelect, selectedTableId }: Props) {
  const { floorPlan } = useLayoutStore();

  const getAreaName = (areaId: number | null) => {
    if (!areaId) return 'No area';
    return floorPlan.areas.find((a) => a.id === areaId)?.name ?? 'Unknown';
  };

  if (scored.length === 0) return null;

  return (
    <div className="mt-3">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
        Recommended Tables
      </div>
      <div className="flex flex-col gap-2">
        {scored.map((st, i) => (
          <button
            key={st.table.id}
            onClick={() => onSelect(st.table.id)}
            className={`text-left rounded-lg border p-3 transition-all ${
              selectedTableId === st.table.id
                ? 'border-blue-500 bg-blue-50 shadow-sm'
                : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-400 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <span className="font-semibold text-slate-800">{st.table.label}</span>
                <span className="text-xs text-slate-500">{st.table.capacity} seats · {getAreaName(st.table.areaId)}</span>
              </div>
              <div className="text-xs font-bold text-emerald-600">
                {Math.round(st.score * 100)}%
              </div>
            </div>
            <div className="text-xs text-slate-500 mt-1 ml-8">{st.reason}</div>
            <div className="flex gap-3 mt-1.5 ml-8">
              <div className="text-[10px] text-slate-400">
                Fit: <span className="text-slate-600">{Math.round(st.efficiencyScore * 100)}%</span>
              </div>
              <div className="text-[10px] text-slate-400">
                Area: <span className="text-slate-600">{Math.round(st.areaPreferenceScore * 100)}%</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
