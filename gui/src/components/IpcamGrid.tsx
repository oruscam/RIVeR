import { useEffect, useMemo, useRef, useState } from 'react';
import { useIpcamSlice, useProjectSlice } from '../hooks';
import { UNIT_CONVERSIONS } from '../constants/constants';
import DataGrid, { SelectColumn, DataGridHandle } from 'react-data-grid';
import { useTranslation } from 'react-i18next';
import { ErrorSort, IpcamGridRow, ipcamGridRows, nextErrorSort } from '../helpers/ipcamGridRows';

const rowKeyGetter = (row: IpcamGridRow): number => row.id;

const SORT_GLYPH: Record<ErrorSort, string> = { none: '', worst: ' ↓', best: ' ↑' };

export const IpcamGrid = () => {
  const ref = useRef<DataGridHandle | null>(null);
  const [selectedRows, setSelectedRows] = useState<ReadonlySet<number>>(() => new Set());
  const [previousSelectedRows, setPreviousSelectedRows] = useState<ReadonlySet<number>>(() => new Set());
  const [sort, setSort] = useState<ErrorSort>('none');

  const {
    points,
    activePoint,
    cameraSolution,
    onChangePointSelected,
    onSetPointPixelCoordinates,
    onChangeActiveImage,
  } = useIpcamSlice();

  const { video, projectDetails } = useProjectSlice();
  const { width, height } = video.data;
  const { factor: imageReduceFactor } = video.parameters;
  const isImperial = projectDetails.unitSistem === 'imperial';
  const coordFactor = isImperial ? UNIT_CONVERSIONS.M_TO_FT : 1;
  const { t } = useTranslation();

  const rows = useMemo(
    () => (points === null ? [] : ipcamGridRows(points, cameraSolution, coordFactor, sort)),
    [points, cameraSolution, coordFactor, sort]
  );

  const columns = useMemo(
    () => [
      {
        ...SelectColumn,
        name: 'select',
        width: 28,
        cellClass: 'cp-cell-select',
        headerCellClass: 'cp-cell-select',
      },
      {
        key: 'label',
        name: t('ControlPoints3d.label'),
        cellClass: 'cp-cell-label',
        headerCellClass: 'cp-cell-label',
      },
      { key: 'X', name: t('ControlPoints3d.east'), cellClass: 'cp-cell-num', headerCellClass: 'cp-cell-num' },
      { key: 'Y', name: t('ControlPoints3d.north'), cellClass: 'cp-cell-num', headerCellClass: 'cp-cell-num' },
      { key: 'Z', name: 'Z', width: 56, cellClass: 'cp-cell-num', headerCellClass: 'cp-cell-num' },
      {
        key: 'error',
        name: t('ControlPoints3d.errorPx'),
        width: 72,
        cellClass: 'cp-cell-num',
        headerCellClass: 'cp-cell-num',
        renderHeaderCell: () => (
          <button
            type="button"
            className="cp-sort"
            aria-pressed={sort !== 'none' ? true : undefined}
            onClick={() => setSort(nextErrorSort(sort))}
          >
            {t('ControlPoints3d.errorPx')}
            {SORT_GLYPH[sort]}
          </button>
        ),
        renderCell: ({ row }: { row: IpcamGridRow }) =>
          row.error === null ? null : (
            <span className={`cp-err${row.grade && row.grade !== 'good' ? ` cp-err-${row.grade}` : ''}`}>
              {row.error.toFixed(2)}
            </span>
          ),
      },
    ],
    [t, sort]
  );

  const handleCellClick = ({ row, column }: { row: IpcamGridRow; column: { key: string } }) => {
    if (column.key === 'select-row') {
      onChangePointSelected({ index: row.id });
      return;
    }
    if (points && points[row.id].image != null) {
      onChangeActiveImage(points[row.id].image!);
    }
    onSetPointPixelCoordinates({
      index: row.id,
      imageSize: { width: width * imageReduceFactor, height: height * imageReduceFactor },
    });
  };

  useEffect(() => {
    if (points !== null) {
      const selected = new Set(points.flatMap((point, index) => (point.selected ? [index] : [])));
      setSelectedRows(selected);
      setPreviousSelectedRows(selected);
    }
  }, [points]);

  // Keep the active point's row in view, wherever the sort has put it.
  useEffect(() => {
    if (activePoint === null || activePoint === undefined) return;
    const rowIdx = rows.findIndex((row) => row.id === activePoint);
    if (rowIdx >= 0) ref.current?.scrollToCell({ rowIdx });
  }, [activePoint, rows]);

  // The header checkbox has no event of its own: a jump to all or none selected is how it shows.
  useEffect(() => {
    if (selectedRows.size === points?.length || selectedRows.size === 0) {
      if (selectedRows.size !== previousSelectedRows.size) {
        onChangePointSelected({ rowsIndex: selectedRows.size });
        setPreviousSelectedRows(selectedRows);
      }
    }
  }, [selectedRows, points?.length, previousSelectedRows.size, onChangePointSelected]);

  if (points === null) return null;

  const active = activePoint === null || activePoint === undefined ? null : points[activePoint];

  return (
    <div className="grid-container" id="ipcam-grid">
      <DataGrid
        columns={columns}
        rows={rows}
        rowHeight={30}
        headerRowHeight={30}
        selectedRows={selectedRows}
        onSelectedRowsChange={setSelectedRows}
        rowKeyGetter={rowKeyGetter}
        rowClass={(row) =>
          [row.id === activePoint ? 'cp-row-active' : '', row.selected ? '' : 'cp-row-off'].join(' ').trim()
        }
        className="grid"
        onCellClick={handleCellClick}
        ref={ref}
      />
      {active && !(active.x === 0 && active.y === 0) && (
        <div className="cp-table-foot">
          <span>{t('ControlPoints3d.onTheFrame', { label: active.label })}</span>
          <span>
            x {active.x.toFixed(1)} · y {active.y.toFixed(1)} px
          </span>
        </div>
      )}
    </div>
  );
};
