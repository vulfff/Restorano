const LEGEND_ITEMS = [
  { label: 'Available',    className: 'bg-white border-2 border-slate-300' },
  { label: 'Reserved',     className: 'bg-slate-100 border-2 border-slate-300 opacity-60' },
  { label: 'Selected',     className: 'bg-blue-500 border-2 border-blue-600' },
  { label: 'Recommended',  className: 'bg-amber-400 border-2 border-amber-500' },
  { label: 'Too small',    className: 'bg-red-50 border-2 border-red-200 opacity-60' },
];

export default function TableLegend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-slate-600">
      {LEGEND_ITEMS.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <div className={`w-4 h-4 rounded ${item.className}`} />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
