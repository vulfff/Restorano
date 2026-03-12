import type { Area } from '../../types/layout';

interface Props {
  area: Area;
  cellSize: number;
}

export default function AreaRect({ area, cellSize }: Props) {
  const left = (area.topLeftCol - 1) * cellSize;
  const top = (area.topLeftRow - 1) * cellSize;
  const width = (area.bottomRightCol - area.topLeftCol + 1) * cellSize;
  const height = (area.bottomRightRow - area.topLeftRow + 1) * cellSize;

  return (
    <div
      className="absolute rounded-xl border-2 flex items-start p-2"
      style={{
        left,
        top,
        width,
        height,
        backgroundColor: area.color + 'cc',
        borderColor: area.color,
      }}
    >
      <span className="text-xs font-semibold text-slate-600 opacity-80">{area.name}</span>
    </div>
  );
}
