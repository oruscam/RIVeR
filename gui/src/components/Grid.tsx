import 'react-data-grid/lib/styles.css';
import DataGrid, { Row, SelectColumn } from 'react-data-grid';
import { useEffect, useMemo, useState } from 'react';
import { useProjectSlice, useSectionSlice, useUiSlice } from '../hooks';
import { UNIT_CONVERSIONS } from '../constants/constants';
import { CopyBtn } from './CustomIcons/CopyBtn';
import { useTranslation } from 'react-i18next';
import { getEffectiveTechniqueData } from '../helpers';

interface TableRow {
  key: number;
  id: number;
  x: string;
  d: string;
  A: string;
  Vs: string;
  Q: string;
  excluded: boolean;
  interpolated: boolean;
}

const rowKeyGetter = (row: TableRow): number => {
  return row.id;
};

const TECHNIQUE_LABEL = { lspiv: 'LSPIV', stiv: 'STIV', iwave: 'iWave' };

const formatCell = (v: number | null) => (v === null ? '-' : v.toFixed(3));

export const Grid = () => {
  const [selectedRows, setSelectedRows] = useState((): ReadonlySet<number> => new Set());
  const [copied, setCopied] = useState(false);
  const { sections, activeSection, onChangeDataValues } = useSectionSlice();
  const { projectDetails } = useProjectSlice();
  const { hoveredStation, onSetHoveredStation } = useUiSlice();
  const { t } = useTranslation();
  const isImperial = projectDetails.unitSistem === 'imperial';
  const lFactor = isImperial ? UNIT_CONVERSIONS.M_TO_FT : 1;
  const aFactor = isImperial ? UNIT_CONVERSIONS.M_TO_FT * UNIT_CONVERSIONS.M_TO_FT : 1;
  const qFactor = isImperial ? UNIT_CONVERSIONS.M3_TO_FT3 : 1;

  const section = sections[activeSection];
  const activeTechnique = section?.activeTechnique ?? 'lspiv';
  const activeTechniqueLabel = TECHNIQUE_LABEL[activeTechnique];
  const techOptions = {
    interpolated: section?.interpolated ?? false,
    artificialSeeding: section?.artificialSeeding ?? false,
    alpha: section?.alpha ?? 1,
  };

  const copyAllDataToClipboard = () => {
    if (!section || !section.data) return;
    const { data } = section;
    const effective = getEffectiveTechniqueData(data, activeTechnique, techOptions);
    if (!effective) return;

    const { num_stations, distance, depth } = data;
    const { resolved, A, Q } = effective;

    const headers = ['#', 'x', 'd', 'A', `Vs (${activeTechniqueLabel})`, 'Q'];

    const dataRows = Array.from({ length: num_stations }, (_, i) => [
      i.toString(),
      typeof distance[i] === 'number' ? (distance[i] * lFactor).toFixed(2) : '-',
      typeof depth[i] === 'number' ? (depth[i] * lFactor).toFixed(2) : '-',
      typeof A[i] === 'number' ? (A[i] * aFactor).toFixed(2) : '-',
      formatCell(resolved[i] === null ? null : resolved[i]! * lFactor),
      formatCell(resolved[i] === null ? null : Q[i] * qFactor),
    ]);

    const allRows = [headers, ...dataRows];
    const textData = allRows.map((row) => row.join('\t')).join('\n');

    navigator.clipboard
      .writeText(textData)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch((err) => {
        console.error('Error trying to copy table:', err);
      });
  };

  const getCellClass = (row: TableRow) => {
    if (row.interpolated) return 'centered-cell cell-interpolated-values';
    if (row.excluded) return 'centered-cell disabled-cell';
    return 'centered-cell';
  };

  const columns = [
    {
      ...SelectColumn,
      cellClass: 'centered-cell',
      headerCellClass: 'select-cell-grid-results',
    },
    {
      key: 'id',
      name: '#',
      cellClass: 'centered-cell',
      headerCellClass: 'centered-cell',
      renderHeaderCell: () => <span title={t('Results.stationTooltip')}>#</span>,
    },
    {
      key: 'x',
      name: 'x',
      cellClass: 'centered-cell',
      headerCellClass: 'centered-cell',
      renderHeaderCell: () => <span title={t('Results.xTooltip')}>x</span>,
    },
    {
      key: 'd',
      name: 'd',
      cellClass: 'centered-cell',
      headerCellClass: 'centered-cell',
      renderHeaderCell: () => <span title={t('Results.dTooltip')}>d</span>,
    },
    {
      key: 'A',
      name: 'A',
      cellClass: 'centered-cell',
      headerCellClass: 'centered-cell',
      renderHeaderCell: () => <span title={t('Results.aTooltip')}>A</span>,
    },
    {
      key: 'Vs',
      name: 'Vs',
      cellClass: getCellClass,
      headerCellClass: 'centered-cell',
      renderHeaderCell: () => (
        <span title={t('Results.vsTooltip')}>
          Vs<span className="header-subtech">({activeTechniqueLabel})</span>
        </span>
      ),
    },
    {
      key: 'Q',
      name: 'Q',
      cellClass: getCellClass,
      headerCellClass: 'centered-cell',
      renderHeaderCell: () => <span title={t('Results.qTooltip')}>Q</span>,
    },
  ];

  const handleCellClick = (cell: { row: TableRow; column: { key: string } }) => {
    const { row, column } = cell;
    if (column.key === 'select-row') {
      onChangeDataValues({
        type: 'check',
        rowIndex: row.id,
      });
    }
  };

  const rows = useMemo((): TableRow[] => {
    if (!section || !section.data) return [];
    const { data } = section;
    const effective = getEffectiveTechniqueData(data, section.activeTechnique, {
      interpolated: section.interpolated,
      artificialSeeding: section.artificialSeeding,
      alpha: section.alpha,
    });
    if (!effective) return [];

    const { num_stations, distance, depth, activeCheck } = data;
    const { resolved, A, Q, interpFlags } = effective;

    return Array.from({ length: num_stations }, (_, i) => ({
      key: i,
      id: i,
      x: typeof distance[i] === 'number' ? (distance[i] * lFactor).toFixed(2) : '-',
      d: typeof depth[i] === 'number' ? (depth[i] * lFactor).toFixed(2) : '-',
      A: typeof A[i] === 'number' ? (A[i] * aFactor).toFixed(2) : '-',
      Vs: formatCell(resolved[i] === null ? null : resolved[i]! * lFactor),
      Q: formatCell(resolved[i] === null ? null : Q[i] * qFactor),
      interpolated: interpFlags[i],
      excluded: !activeCheck[i] && !interpFlags[i],
    }));
  }, [section, lFactor, aFactor, qFactor]);

  useEffect(() => {
    if (section && section.data && Array.isArray(section.data.activeCheck)) {
      const selectedRowIndices = section.data.activeCheck
        .map((isSelected, index) => (isSelected ? index : null))
        .filter((index) => index !== null);
      setSelectedRows(new Set(selectedRowIndices));
    }
  }, [section]);

  const onClickClipboard = () => {
    copyAllDataToClipboard();
  };

  const onRowMouseEnter = (rowIdx: number) => onSetHoveredStation(rowIdx);
  const onRowMouseLeave = () => onSetHoveredStation(null);

  return (
    <div className="grid-and-clipboard">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '96%',
          marginLeft: 'auto',
          marginRight: 'auto',
          marginBottom: '6px',
        }}
      >
        <div className="copy-btn-wrap" title={copied ? t('Results.copied') : t('Results.copyTable')}>
          <CopyBtn onClickFunction={onClickClipboard} />
        </div>
      </div>
      <div className="grid-container">
        <DataGrid
          className="grid"
          columns={columns}
          rows={rows}
          selectedRows={selectedRows}
          onSelectedRowsChange={setSelectedRows}
          rowKeyGetter={rowKeyGetter}
          onCellClick={handleCellClick}
          enableVirtualization={true}
          rowClass={(row) => (row.id === hoveredStation ? 'row-hovered-from-chart' : '')}
          renderers={{
            renderRow: (key, props) => (
              <Row
                key={key}
                {...props}
                onMouseEnter={() => onRowMouseEnter(props.row.id)}
                onMouseLeave={onRowMouseLeave}
              />
            ),
          }}
        />
      </div>
    </div>
  );
};
