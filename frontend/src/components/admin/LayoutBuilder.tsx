import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { Area, Table } from '../../types/layout';
import { useLayoutStore } from '../../store/layoutStore';
import * as layoutApi from '../../api/layoutApi';

const CELL_SIZE = 60;
const HANDLE_SIZE = 10; // px — resize handle square

type Tool = 'select' | 'draw-area' | 'add-table';
type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'se' | 'sw';

interface DrawDragState {
  startCol: number;
  startRow: number;
  endCol: number;
  endRow: number;
}

interface ResizeDragState {
  areaId: number;
  handle: ResizeHandle;
  originalArea: Area;
}

const HANDLE_CURSORS: Record<ResizeHandle, string> = {
  n: 'ns-resize', s: 'ns-resize',
  e: 'ew-resize', w: 'ew-resize',
  nw: 'nwse-resize', se: 'nwse-resize',
  ne: 'nesw-resize', sw: 'nesw-resize',
};

// Absolute position style for each handle (relative to the area div)
function handleStyle(h: ResizeHandle, w: number, ht: number): React.CSSProperties {
  const half = HANDLE_SIZE / 2;
  const mid = { left: w / 2 - half, top: ht / 2 - half };
  const positions: Record<ResizeHandle, React.CSSProperties> = {
    nw: { top: -half, left: -half },
    n:  { top: -half, left: mid.left },
    ne: { top: -half, right: -half },
    e:  { top: mid.top, right: -half },
    se: { bottom: -half, right: -half },
    s:  { bottom: -half, left: mid.left },
    sw: { bottom: -half, left: -half },
    w:  { top: mid.top, left: -half },
  };
  return {
    position: 'absolute',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    cursor: HANDLE_CURSORS[h],
    backgroundColor: 'white',
    border: '2px solid #0f4c3a',
    borderRadius: 2,
    zIndex: 10,
    ...positions[h],
  };
}

const MIN_AREA_CELLS = 2; // minimum size in each dimension

function areasOverlap(a: Area, b: Area): boolean {
  return (
    a.topLeftCol <= b.bottomRightCol &&
    a.bottomRightCol >= b.topLeftCol &&
    a.topLeftRow <= b.bottomRightRow &&
    a.bottomRightRow >= b.topLeftRow
  );
}

function wouldOverlap(candidate: Area, allAreas: Area[], excludeId?: number): boolean {
  return allAreas.some((a) => a.id !== excludeId && areasOverlap(candidate, a));
}

function tablesOverlap(a: Table, b: Table): boolean {
  return (
    a.col < b.col + b.widthCells &&
    a.col + a.widthCells > b.col &&
    a.row < b.row + b.heightCells &&
    a.row + a.heightCells > b.row
  );
}

function wouldTableOverlap(candidate: Table, allTables: Table[], excludeId?: number): boolean {
  return allTables.some(
    (t) => t.id !== excludeId && !t.parentFusedId && tablesOverlap(candidate, t)
  );
}

let nextTempId = 1000;

export default function LayoutBuilder() {
  const { t } = useTranslation();
  const { floorPlan, addArea, updateArea, removeArea, addTable, updateTable, removeTable, splitTable, reservations } = useLayoutStore();
  const [tool, setTool] = useState<Tool>('select');
  const [selectedTableIds, setSelectedTableIds] = useState<number[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);
  const [drawDrag, setDrawDrag] = useState<DrawDragState | null>(null);
  const [tableDrag, setTableDrag] = useState<DrawDragState & { constraintArea: Area | null } | null>(null);
  const [resizeDrag, setResizeDrag] = useState<ResizeDragState | null>(null);
  const [areaName, setAreaName] = useState('New Area');
  const [areaColor, setAreaColor] = useState('#dbeafe');
  const [defaultCapacity, setDefaultCapacity] = useState(4);
  const [draggingTableId, setDraggingTableId] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ col: 0, row: 0 });
  const [overlapError, setOverlapError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const getCellFromEvent = useCallback((e: React.MouseEvent) => {
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const col = Math.floor((e.clientX - rect.left) / CELL_SIZE) + 1;
    const row = Math.floor((e.clientY - rect.top) / CELL_SIZE) + 1;
    if (col < 1 || col > floorPlan.gridCols || row < 1 || row > floorPlan.gridRows) return null;
    return { col, row };
  }, [floorPlan.gridCols, floorPlan.gridRows]);

  // Clamp cell values within grid bounds
  const clampCol = (c: number) => Math.max(1, Math.min(c, floorPlan.gridCols));
  const clampRow = (r: number) => Math.max(1, Math.min(r, floorPlan.gridRows));

  // Auto-number table labels based on existing tables
  const nextTableLabel = () => {
    const nums = floorPlan.tables
      .filter((t) => !t.parentFusedId)
      .map((t) => parseInt(t.label.replace(/\D/g, ''), 10))
      .filter((n) => !isNaN(n));
    return `T${nums.length > 0 ? Math.max(...nums) + 1 : 1}`;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Resize handles call stopPropagation, so this won't fire during resize start
    const cell = getCellFromEvent(e);
    if (!cell) return;

    if (tool === 'draw-area') {
      setDrawDrag({ startCol: cell.col, startRow: cell.row, endCol: cell.col, endRow: cell.row });
      return;
    }

    if (tool === 'add-table') {
      // Find which area this cell belongs to (if any) — constrains the draw
      const constraintArea = floorPlan.areas.find(
        (a) => cell.col >= a.topLeftCol && cell.col <= a.bottomRightCol &&
                cell.row >= a.topLeftRow && cell.row <= a.bottomRightRow
      ) ?? null;
      setTableDrag({ startCol: cell.col, startRow: cell.row, endCol: cell.col, endRow: cell.row, constraintArea });
      return;
    }

    if (tool === 'select') {
      // Check if clicked on a visible table (skip hidden constituents)
      const clickedTable = floorPlan.tables.find(
        (t) => !t.parentFusedId &&
                cell.col >= t.col && cell.col < t.col + t.widthCells &&
                cell.row >= t.row && cell.row < t.row + t.heightCells
      );
      if (clickedTable) {
        setDraggingTableId(clickedTable.id);
        setDragOffset({ col: cell.col - clickedTable.col, row: cell.row - clickedTable.row });
        if (e.shiftKey) {
          setSelectedTableIds((prev) =>
            prev.includes(clickedTable.id)
              ? prev.filter((id) => id !== clickedTable.id)
              : [...prev, clickedTable.id]
          );
        } else {
          setSelectedTableIds([clickedTable.id]);
        }
        setSelectedAreaId(null);
        return;
      }

      // Check if clicked on an area
      const clickedArea = floorPlan.areas.find(
        (a) => cell.col >= a.topLeftCol && cell.col <= a.bottomRightCol &&
                cell.row >= a.topLeftRow && cell.row <= a.bottomRightRow
      );
      setSelectedAreaId(clickedArea?.id ?? null);
      setSelectedTableIds([]);
    }
  };

  const handleResizeStart = (e: React.MouseEvent, area: Area, handle: ResizeHandle) => {
    e.stopPropagation();
    e.preventDefault();
    setResizeDrag({ areaId: area.id, handle, originalArea: { ...area } });
    setSelectedAreaId(area.id);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Handle area resize
    if (resizeDrag) {
      const rect = gridRef.current?.getBoundingClientRect();
      if (!rect) return;
      const rawCol = Math.floor((e.clientX - rect.left) / CELL_SIZE) + 1;
      const rawRow = Math.floor((e.clientY - rect.top) / CELL_SIZE) + 1;
      const col = clampCol(rawCol);
      const row = clampRow(rawRow);

      const { handle } = resizeDrag;
      // Start from current store state so name/color edits are preserved
      const current = floorPlan.areas.find((a) => a.id === resizeDrag.areaId);
      if (!current) return;
      const updated = { ...current };

      const minSize = MIN_AREA_CELLS - 1; // gap between topLeft and bottomRight to ensure 2-cell min
      if (handle === 'n' || handle === 'nw' || handle === 'ne')
        updated.topLeftRow = Math.min(clampRow(row), current.bottomRightRow - minSize);
      if (handle === 's' || handle === 'sw' || handle === 'se')
        updated.bottomRightRow = Math.max(clampRow(row), current.topLeftRow + minSize);
      if (handle === 'w' || handle === 'nw' || handle === 'sw')
        updated.topLeftCol = Math.min(clampCol(col), current.bottomRightCol - minSize);
      if (handle === 'e' || handle === 'ne' || handle === 'se')
        updated.bottomRightCol = Math.max(clampCol(col), current.topLeftCol + minSize);

      // Block update if the resized area would overlap another area
      if (wouldOverlap(updated, floorPlan.areas, resizeDrag.areaId)) return;

      updateArea(updated);
      return;
    }

    const cell = getCellFromEvent(e);
    if (!cell) return;

    if (tool === 'draw-area' && drawDrag) {
      setDrawDrag((prev) => prev ? { ...prev, endCol: cell.col, endRow: cell.row } : null);
    }

    if (tool === 'add-table' && tableDrag) {
      // Clamp to constraint area bounds if we started inside one
      const ca = tableDrag.constraintArea;
      const endCol = ca ? Math.max(ca.topLeftCol, Math.min(cell.col, ca.bottomRightCol)) : clampCol(cell.col);
      const endRow = ca ? Math.max(ca.topLeftRow, Math.min(cell.row, ca.bottomRightRow)) : clampRow(cell.row);
      setTableDrag((prev) => prev ? { ...prev, endCol, endRow } : null);
    }

    if (draggingTableId !== null) {
      const newCol = cell.col - dragOffset.col;
      const newRow = cell.row - dragOffset.row;
      const table = floorPlan.tables.find((t) => t.id === draggingTableId);
      if (table && newCol >= 1 && newRow >= 1 &&
        newCol + table.widthCells - 1 <= floorPlan.gridCols &&
        newRow + table.heightCells - 1 <= floorPlan.gridRows) {
        updateTable({ ...table, col: newCol, row: newRow });
      }
    }
  };

  const handleMouseUp = (_e: React.MouseEvent) => {
    if (resizeDrag) {
      setResizeDrag(null);
      return;
    }

    if (tool === 'draw-area' && drawDrag) {
      const minCol = Math.min(drawDrag.startCol, drawDrag.endCol);
      const maxCol = Math.max(drawDrag.startCol, drawDrag.endCol);
      const minRow = Math.min(drawDrag.startRow, drawDrag.endRow);
      const maxRow = Math.max(drawDrag.startRow, drawDrag.endRow);

      setDrawDrag(null);

      // Enforce 2×2 minimum
      if (maxCol - minCol + 1 < MIN_AREA_CELLS || maxRow - minRow + 1 < MIN_AREA_CELLS) return;

      const newArea: Area = {
        id: nextTempId++,
        name: areaName,
        color: areaColor,
        topLeftCol: minCol,
        topLeftRow: minRow,
        bottomRightCol: maxCol,
        bottomRightRow: maxRow,
      };

      // Block creation if it would overlap an existing area
      if (wouldOverlap(newArea, floorPlan.areas)) {
        setOverlapError(t('builder.errorAreaOverlap'));
        setTimeout(() => setOverlapError(null), 2500);
        return;
      }

      addArea(newArea);
      return;
    }

    if (tool === 'add-table' && tableDrag) {
      const minCol = Math.min(tableDrag.startCol, tableDrag.endCol);
      const maxCol = Math.max(tableDrag.startCol, tableDrag.endCol);
      const minRow = Math.min(tableDrag.startRow, tableDrag.endRow);
      const maxRow = Math.max(tableDrag.startRow, tableDrag.endRow);

      setTableDrag(null);

      const newTable: Table = {
        id: nextTempId++,
        label: nextTableLabel(),
        capacity: defaultCapacity,
        col: minCol,
        row: minRow,
        widthCells: maxCol - minCol + 1,
        heightCells: maxRow - minRow + 1,
        areaId: tableDrag.constraintArea?.id ?? null,
        isFused: false,
        fusedTableIds: null,
      };

      if (wouldTableOverlap(newTable, floorPlan.tables)) {
        setOverlapError(t('builder.errorTableOverlap'));
        setTimeout(() => setOverlapError(null), 2500);
        return;
      }

      addTable(newTable);
      // Auto-select the new table so user can edit label/capacity immediately
      setSelectedTableIds([newTable.id]);
      setSelectedAreaId(null);
      return;
    }

    setDraggingTableId(null);
  };

  const handleSaveLayout = async () => {
    setSaveStatus('saving');
    setSaveError(null);
    try {
      const saved = await layoutApi.saveLayout(floorPlan);
      useLayoutStore.getState().setFloorPlan(saved);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { details?: string[] } } };
      if (axiosErr?.response?.status === 409) {
        const details = axiosErr.response?.data?.details;
        setSaveError(details?.join(', ') ?? t('builder.errorFutureReservations'));
      } else {
        setSaveError(t('builder.errorSaveFailed'));
      }
      setSaveStatus('error');
    }
  };

  const handleDeleteSelected = () => {
    const now = new Date().toISOString();
    const blockedLabels = selectedTableIds
      .filter((id) =>
        reservations.some(
          (res) => res.tableIds.includes(id) && res.startsAt > now
        )
      )
      .map((id) => floorPlan.tables.find((t) => t.id === id)?.label ?? String(id));

    if (blockedLabels.length > 0) {
      setOverlapError(t('builder.errorDeleteBlocked', { labels: blockedLabels.join(', ') }));
      setTimeout(() => setOverlapError(null), 3000);
      return;
    }

    selectedTableIds.forEach((id) => removeTable(id));
    setSelectedTableIds([]);
    if (selectedAreaId !== null) {
      removeArea(selectedAreaId);
      setSelectedAreaId(null);
    }
  };

  const handleJoinTables = () => {
    const tables = floorPlan.tables.filter((t) => selectedTableIds.includes(t.id));
    if (tables.length < 2) return;
    const minCol = Math.min(...tables.map((t) => t.col));
    const minRow = Math.min(...tables.map((t) => t.row));
    const maxCol = Math.max(...tables.map((t) => t.col + t.widthCells - 1));
    const maxRow = Math.max(...tables.map((t) => t.row + t.heightCells - 1));
    const fusedId = nextTempId++;
    const fused: Table = {
      id: fusedId,
      label: tables.map((t) => t.label).join('+'),
      capacity: tables.reduce((s, t) => s + t.capacity, 0),
      col: minCol,
      row: minRow,
      widthCells: maxCol - minCol + 1,
      heightCells: maxRow - minRow + 1,
      areaId: tables[0].areaId,
      isFused: true,
      fusedTableIds: tables.map((t) => t.id),
    };
    tables.forEach((t) => updateTable({ ...t, parentFusedId: fusedId }));
    addTable(fused);
    setSelectedTableIds([]);
  };

  // Preview rect while drawing area — compute validity for visual feedback
  const previewRect = drawDrag ? {
    minCol: Math.min(drawDrag.startCol, drawDrag.endCol),
    maxCol: Math.max(drawDrag.startCol, drawDrag.endCol),
    minRow: Math.min(drawDrag.startRow, drawDrag.endRow),
    maxRow: Math.max(drawDrag.startRow, drawDrag.endRow),
  } : null;

  const previewInvalid = previewRect !== null && (
    previewRect.maxCol - previewRect.minCol + 1 < MIN_AREA_CELLS ||
    previewRect.maxRow - previewRect.minRow + 1 < MIN_AREA_CELLS ||
    wouldOverlap(
      { id: -1, name: '', color: '', topLeftCol: previewRect.minCol, topLeftRow: previewRect.minRow, bottomRightCol: previewRect.maxCol, bottomRightRow: previewRect.maxRow },
      floorPlan.areas
    )
  );

  // Preview rect while drawing table
  const tablePreviewRect = tableDrag ? {
    minCol: Math.min(tableDrag.startCol, tableDrag.endCol),
    maxCol: Math.max(tableDrag.startCol, tableDrag.endCol),
    minRow: Math.min(tableDrag.startRow, tableDrag.endRow),
    maxRow: Math.max(tableDrag.startRow, tableDrag.endRow),
  } : null;

  const tablePreviewInvalid = tablePreviewRect !== null && wouldTableOverlap(
    {
      id: -1, label: '', capacity: 0,
      col: tablePreviewRect.minCol, row: tablePreviewRect.minRow,
      widthCells: tablePreviewRect.maxCol - tablePreviewRect.minCol + 1,
      heightCells: tablePreviewRect.maxRow - tablePreviewRect.minRow + 1,
      areaId: null, isFused: false, fusedTableIds: null,
    },
    floorPlan.tables
  );

  const HANDLES: ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

  // Single selected non-fused table for sidebar editing
  const singleSelectedTable = selectedTableIds.length === 1
    ? floorPlan.tables.find((t) => t.id === selectedTableIds[0] && !t.isFused)
    : undefined;

  return (
    <div className="flex gap-4 h-full">
      {/* Sidebar */}
      <div className="w-56 flex-shrink-0 bg-white border border-[#e8e3db] rounded-xl p-4 flex flex-col gap-4">
        <div>
          <div className="text-xs font-semibold text-[#78716c] uppercase tracking-wide mb-2">{t('builder.tool')}</div>
          {(['select', 'draw-area', 'add-table'] as Tool[]).map((toolOption) => (
            <button
              key={toolOption}
              onClick={() => setTool(toolOption)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition-colors ${
                tool === toolOption ? 'bg-[#0f4c3a] text-white' : 'text-[#1c1917] hover:bg-[#f9f7f4]'
              }`}
            >
              {toolOption === 'select' ? t('builder.toolSelect') : toolOption === 'draw-area' ? t('builder.toolDrawArea') : t('builder.toolDrawTable')}
            </button>
          ))}
        </div>

        {tool === 'draw-area' && (
          <div>
            <div className="text-xs font-semibold text-[#78716c] uppercase tracking-wide mb-2">{t('builder.areaSettings')}</div>
            <input
              type="text"
              value={areaName}
              onChange={(e) => setAreaName(e.target.value)}
              placeholder={t('builder.areaNamePlaceholder')}
              className="w-full border border-[#e8e3db] rounded px-2 py-1.5 text-sm mb-2 focus:outline-none focus:ring-1 focus:ring-[#0f4c3a]"
            />
            <div className="flex items-center gap-2">
              <label className="text-xs text-[#78716c]">{t('builder.color')}</label>
              <input
                type="color"
                value={areaColor}
                onChange={(e) => setAreaColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border border-[#e8e3db]"
              />
            </div>
          </div>
        )}

        {tool === 'add-table' && (
          <div>
            <div className="text-xs font-semibold text-[#78716c] uppercase tracking-wide mb-2">{t('builder.defaultCapacity')}</div>
            <input
              type="number"
              min={1}
              max={20}
              value={defaultCapacity}
              onChange={(e) => setDefaultCapacity(parseInt(e.target.value, 10))}
              className="w-full border border-[#e8e3db] rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#0f4c3a]"
            />
            <p className="text-[11px] text-[#a8a29e] mt-1">{t('builder.drawHint')}</p>
          </div>
        )}

        {/* Single non-fused table editing */}
        {singleSelectedTable && (
          <div className="border-t border-[#e8e3db] pt-3 flex flex-col gap-2">
            <div className="text-xs font-semibold text-[#78716c] uppercase tracking-wide">{t('builder.editTable')}</div>
            <div>
              <label className="text-xs text-[#78716c] block mb-1">{t('builder.label')}</label>
              <input
                type="text"
                value={singleSelectedTable.label}
                onChange={(e) => updateTable({ ...singleSelectedTable, label: e.target.value })}
                className="w-full border border-[#e8e3db] rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#0f4c3a]"
              />
            </div>
            <div>
              <label className="text-xs text-[#78716c] block mb-1">{t('builder.capacity')}</label>
              <input
                type="number"
                min={1}
                max={30}
                value={singleSelectedTable.capacity}
                onChange={(e) => updateTable({ ...singleSelectedTable, capacity: parseInt(e.target.value, 10) || 1 })}
                className="w-full border border-[#e8e3db] rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#0f4c3a]"
              />
            </div>
          </div>
        )}

        {selectedTableIds.length > 0 && (
          <div className="border-t border-[#e8e3db] pt-3 flex flex-col gap-2">
            <div className="text-xs text-[#78716c]">{t('builder.tablesSelected', { count: selectedTableIds.length })}</div>
            {selectedTableIds.length === 1 &&
              floorPlan.tables.find((t) => t.id === selectedTableIds[0])?.isFused && (
              <button
                onClick={() => {
                  splitTable(selectedTableIds[0]);
                  setSelectedTableIds([]);
                }}
                className="w-full py-1.5 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600"
              >
                {t('builder.splitTable')}
              </button>
            )}
            {selectedTableIds.length >= 2 && (
              <button
                onClick={handleJoinTables}
                className="w-full py-1.5 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600"
              >
                {t('builder.joinTables')}
              </button>
            )}
            <button
              onClick={handleDeleteSelected}
              className="w-full py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              {t('builder.delete')}
            </button>
          </div>
        )}

        {selectedAreaId !== null && (() => {
          const selectedArea = floorPlan.areas.find((a) => a.id === selectedAreaId);
          if (!selectedArea) return null;
          return (
            <div className="border-t border-[#e8e3db] pt-3 flex flex-col gap-2">
              <div className="text-xs font-semibold text-[#78716c] uppercase tracking-wide">{t('builder.editArea')}</div>
              <div>
                <label className="text-xs text-[#78716c] block mb-1">{t('builder.name')}</label>
                <input
                  type="text"
                  value={selectedArea.name}
                  onChange={(e) => updateArea({ ...selectedArea, name: e.target.value })}
                  className="w-full border border-[#e8e3db] rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#0f4c3a]"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-[#78716c]">{t('builder.color')}</label>
                <input
                  type="color"
                  value={selectedArea.color}
                  onChange={(e) => updateArea({ ...selectedArea, color: e.target.value })}
                  className="w-8 h-8 rounded cursor-pointer border border-[#e8e3db]"
                />
                <span className="text-xs text-[#a8a29e]">{selectedArea.color}</span>
              </div>
              <button
                onClick={handleDeleteSelected}
                className="w-full py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 mt-1"
              >
                {t('builder.deleteArea')}
              </button>
            </div>
          );
        })()}

        <div className="mt-auto">
          <button
            onClick={handleSaveLayout}
            disabled={saveStatus === 'saving'}
            className="w-full py-2 bg-[#0f4c3a] text-white rounded-lg hover:bg-[#1a6b52] text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saveStatus === 'saving' ? t('builder.saving') : saveStatus === 'saved' ? t('builder.saved') : t('builder.saveLayout')}
          </button>
          {saveError && <p className="text-xs text-red-500 mt-1">{saveError}</p>}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-auto">
        <div
          ref={gridRef}
          className="relative select-none"
          style={{
            width: floorPlan.gridCols * CELL_SIZE,
            height: floorPlan.gridRows * CELL_SIZE,
            backgroundImage: `
              linear-gradient(to right, #e2e8f0 1px, transparent 1px),
              linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)
            `,
            backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
            backgroundColor: '#f8fafc',
            cursor: resizeDrag ? HANDLE_CURSORS[resizeDrag.handle] : 'crosshair',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Render areas */}
          {floorPlan.areas.map((area) => {
            const isSelected = selectedAreaId === area.id;
            const areaW = (area.bottomRightCol - area.topLeftCol + 1) * CELL_SIZE;
            const areaH = (area.bottomRightRow - area.topLeftRow + 1) * CELL_SIZE;
            return (
              <div
                key={area.id}
                className={`absolute rounded-xl border-2 pointer-events-none ${
                  isSelected ? 'ring-2 ring-[#0f4c3a] ring-offset-1' : ''
                }`}
                style={{
                  left: (area.topLeftCol - 1) * CELL_SIZE,
                  top: (area.topLeftRow - 1) * CELL_SIZE,
                  width: areaW,
                  height: areaH,
                  backgroundColor: area.color + 'aa',
                  borderColor: isSelected ? '#0f4c3a' : area.color,
                }}
              >
                <span className="text-xs font-semibold text-slate-600 p-2 block">{area.name}</span>

                {/* Resize handles — only on selected area, pointer-events re-enabled */}
                {isSelected && HANDLES.map((handle) => (
                  <div
                    key={handle}
                    style={handleStyle(handle, areaW, areaH)}
                    className="pointer-events-auto"
                    onMouseDown={(e) => handleResizeStart(e, area, handle)}
                  />
                ))}
              </div>
            );
          })}

          {/* Preview rect while drawing area — red when invalid */}
          {previewRect && (
            <div
              className={`absolute rounded-xl border-2 border-dashed pointer-events-none ${
                previewInvalid
                  ? 'border-red-400 bg-red-100/40'
                  : 'border-blue-500 bg-blue-100/40'
              }`}
              style={{
                left: (previewRect.minCol - 1) * CELL_SIZE,
                top: (previewRect.minRow - 1) * CELL_SIZE,
                width: (previewRect.maxCol - previewRect.minCol + 1) * CELL_SIZE,
                height: (previewRect.maxRow - previewRect.minRow + 1) * CELL_SIZE,
              }}
            />
          )}

          {/* Preview rect while drawing table */}
          {tablePreviewRect && (
            <div
              className={`absolute rounded-lg border-2 border-dashed pointer-events-none flex items-center justify-center ${
                tablePreviewInvalid
                  ? 'border-red-400 bg-red-100/50'
                  : 'border-indigo-500 bg-indigo-100/50'
              }`}
              style={{
                left: (tablePreviewRect.minCol - 1) * CELL_SIZE + 4,
                top: (tablePreviewRect.minRow - 1) * CELL_SIZE + 4,
                width: (tablePreviewRect.maxCol - tablePreviewRect.minCol + 1) * CELL_SIZE - 8,
                height: (tablePreviewRect.maxRow - tablePreviewRect.minRow + 1) * CELL_SIZE - 8,
              }}
            >
              <span className={`text-xs font-semibold ${tablePreviewInvalid ? 'text-red-500' : 'text-indigo-600'}`}>
                {tablePreviewInvalid ? '✕' : `${defaultCapacity}p`}
              </span>
            </div>
          )}

          {/* Overlap / too-small error toast */}
          {overlapError && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-red-600 text-white text-xs font-medium px-4 py-2 rounded-lg shadow-lg pointer-events-none z-20">
              {overlapError}
            </div>
          )}

          {/* Render tables — hide constituent tables that are part of a fused group */}
          {floorPlan.tables.filter((t) => !t.parentFusedId).map((table) => {
            const isSelected = selectedTableIds.includes(table.id);
            return (
              <div
                key={table.id}
                className={`absolute flex flex-col items-center justify-center rounded-lg border-2 text-xs font-bold transition-all ${
                  isSelected
                    ? 'border-[#0f4c3a] bg-[#eef7f3] text-[#0f4c3a] shadow-lg'
                    : 'border-[#b5d5c8] bg-white text-[#1c1917] hover:border-[#0f4c3a]'
                } ${draggingTableId === table.id ? 'opacity-80 z-10' : ''}`}
                style={{
                  left: (table.col - 1) * CELL_SIZE + 4,
                  top: (table.row - 1) * CELL_SIZE + 4,
                  width: table.widthCells * CELL_SIZE - 8,
                  height: table.heightCells * CELL_SIZE - 8,
                }}
              >
                <span>{table.label}</span>
                <span className="font-normal text-[10px] opacity-60">{table.capacity}p</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
