import type { ScoredTable } from '../../types/recommendation';
import { useLayoutStore } from '../../store/layoutStore';
import { useTranslation } from 'react-i18next';

interface Props {
  scored: ScoredTable[];
  onSelect: (tableId: number) => void;
  selectedTableId?: number;
}

export default function RecommendedTables({ scored, onSelect, selectedTableId }: Props) {
  const { floorPlan } = useLayoutStore();
  const { t } = useTranslation();

  const getAreaName = (areaId: number | null) => {
    if (!areaId) return 'No area';
    return floorPlan.areas.find((a) => a.id === areaId)?.name ?? 'Unknown';
  };

  if (scored.length === 0) return null;

  return (
    <div className="mt-3">
      <div className="font-display text-sm font-semibold text-[#78716c] tracking-wide mb-2">
        {t('recommend.title')}
      </div>
      <div className="flex flex-col gap-2">
        {scored.map((st, i) => (
          <button
            key={st.table.id}
            onClick={() => onSelect(st.table.id)}
            className={`text-left rounded-lg border p-3 transition-all ${
              selectedTableId === st.table.id
                ? 'border-[#0f4c3a] bg-[#eef7f3] shadow-sm'
                : 'border-[#e8e3db] bg-white hover:border-[#0f4c3a] hover:bg-[#eef7f3]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#d97706] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <span className="font-semibold text-[#1c1917]">{st.table.label}</span>
                <span className="text-xs text-[#78716c]">{st.table.capacity} seats · {getAreaName(st.table.areaId)}</span>
              </div>
              <div className="text-xs font-bold text-[#0f4c3a]">
                {Math.round(st.score * 100)}%
              </div>
            </div>
            <div className="text-xs text-[#78716c] mt-1 ml-8">{st.reason}</div>
            <div className="flex gap-3 mt-1.5 ml-8">
              <div className="text-[10px] text-[#a8a29e]">
                {t('recommend.fit')}: <span className="text-[#78716c]">{Math.round(st.efficiencyScore * 100)}%</span>
              </div>
              <div className="text-[10px] text-[#a8a29e]">
                {t('recommend.area')}: <span className="text-[#78716c]">{Math.round(st.areaPreferenceScore * 100)}%</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
