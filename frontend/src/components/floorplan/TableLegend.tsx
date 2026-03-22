import { useTranslation } from 'react-i18next';

const LEGEND_ITEMS = [
  { key: 'legend.available',   style: { backgroundColor: 'white', border: '2px solid #b5d5c8' } },
  { key: 'legend.reserved',    style: { backgroundColor: '#f5f2ee', border: '2px solid #d6d0c8', opacity: 0.75 } },
  { key: 'legend.selected',    style: { backgroundColor: '#0f4c3a', border: '2px solid #0f4c3a' } },
  { key: 'legend.recommended', style: { backgroundColor: '#d97706', border: '2px solid #b45309' } },
  { key: 'legend.tooSmall',    style: { backgroundColor: '#fff1f2', border: '2px solid #fecdd3', opacity: 0.7 } },
];

export default function TableLegend() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap gap-4 text-xs text-[#78716c]">
      {LEGEND_ITEMS.map((item) => (
        <div key={item.key} className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded" style={item.style} />
          <span>{t(item.key)}</span>
        </div>
      ))}
    </div>
  );
}
