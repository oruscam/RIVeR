import DataGrid, { SelectColumn } from 'react-data-grid';
import 'react-data-grid/lib/styles.css';
import { useEffect, useMemo, useState } from 'react';
import { useSectionSlice } from '../hooks';
import { Clipboard } from './Clipboard';

interface Row {
  key: number;
  id: number;
  x: string;
  d: string;
  A: string;
  Vs: string;
  Q: string;
}

const rowKeyGetter = (row: Row): number => {
  return row.id;
};

const getCellValue = (
  magnitude: number[],
  check: boolean[],
  activeCheck: boolean[],
  index: number,
  interpolated: boolean
) => {
  if (check[index] === activeCheck[index] && Array.isArray(magnitude) && typeof magnitude[index] === 'number') {
    if (check[index] === false && interpolated === false) {
      return '-';
    }
    return magnitude[index].toFixed(3);
  } else {
    return '-';
  }
};

export const Grid = () => {
  const [selectedRows, setSelectedRows] = useState((): ReadonlySet<number> => new Set());
  const { sections, activeSection, onChangeDataValues } = useSectionSlice();

  const copyAllDataToClipboard = () => {
    const section = sections[activeSection];
    if (!section || !section.data) return;

    const { num_stations, distance, depth, Q, A, check, activeMagnitude, activeCheck, interpolated } =
      section.data;

    // Create headers for the table
    const headers = ['#', 'x', 'd', 'A', 'Vs', 'Q'];

    // Create data rows
    const dataRows = Array.from({ length: num_stations }, (_, i) => [
      i.toString(),
      typeof distance[i] === 'number' ? distance[i].toFixed(2) : '-',
      typeof depth[i] === 'number' ? depth[i].toFixed(2) : '-',
      typeof A[i] === 'number' ? A[i].toFixed(2) : '-',
      getCellValue(activeMagnitude, check, activeCheck, i, interpolated),
      typeof Q[i] === 'number' ? getCellValue(Q, check, activeCheck, i, interpolated) : '-',
    ]);

    // Combine headers and data rows
    const allRows = [headers, ...dataRows];

    // Convert to tab-separated values
    const textData = allRows.map((row) => row.join('\t')).join('\n');

    // Copy to clipboard
    navigator.clipboard
      .writeText(textData)
      .then(() => {
        // Optionally, you can show a success message or log it
        console.log('Table copy to clipboard successful!');
      })
      .catch((err) => {
        console.error('Error trying to copy table:', err);
      });
  };

  const getCellClass = (row) => {
    let cellClas = 'centered-cell';
    const { data } = sections[activeSection];
    if (!data?.check[row.id]) {
      if (data?.interpolated) {
        cellClas = 'centered-cell cell-red-values';
      } else {
        cellClas = 'centered-cell disabled-cell';
      }
    }
    return cellClas;
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
    },
    {
      key: 'x',
      name: 'x',
      cellClass: 'centered-cell',
      headerCellClass: 'centered-cell',
    },
    {
      key: 'd',
      name: 'd',
      cellClass: 'centered-cell',
      headerCellClass: 'centered-cell',
    },
    {
      key: 'A',
      name: 'A',
      cellClass: 'centered-cell',
      headerCellClass: 'centered-cell',
    },
    {
      key: 'Vs',
      name: 'Vs',
      cellClass: getCellClass,
      headerCellClass: 'centered-cell',
    },
    {
      key: 'Q',
      name: 'Q',
      cellClass: getCellClass,
      headerCellClass: 'centered-cell',
    },
  ];

  const handleCellClick = (cell: { row: any; column: any }) => {
    const { row, column } = cell;
    if (column.key === 'select-row') {
      onChangeDataValues({
        type: 'check',
        rowIndex: row.id,
      });
    }
  };

  const rows = useMemo(() => {
    const section = sections[activeSection];
    if (section && section.data) {
      const { num_stations, distance, depth, Q, A, check, activeMagnitude, activeCheck, interpolated } =
        section.data;

      return Array.from({ length: num_stations }, (_, i) => ({
        key: i,
        id: i,
        x: typeof distance[i] === 'number' ? distance[i].toFixed(2) : '-',
        d: typeof depth[i] === 'number' ? depth[i].toFixed(2) : '-',
        A: typeof A[i] === 'number' ? A[i].toFixed(2) : '-',
        Vs: getCellValue(activeMagnitude, check, activeCheck, i, interpolated),
        Q: typeof Q[i] === 'number' ? getCellValue(Q, check, activeCheck, i, interpolated) : '-',
      }));
    }
    return [];
  }, [sections, activeSection]);

  useEffect(() => {
    const section = sections[activeSection];
    if (section && section.data && Array.isArray(section.data.activeCheck)) {
      const selectedRowIndices = section.data.activeCheck
        .map((isSelected, index) => (isSelected ? index : null))
        .filter((index) => index !== null);
      setSelectedRows(new Set(selectedRowIndices));
    }
  }, [sections, activeSection]);

  const onClickClipboard = () => {
    copyAllDataToClipboard();
  };

  return (
    <div className="grid-and-clipboard">
      <Clipboard onClickFunction={onClickClipboard} />
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
        />
      </div>
    </div>
  );
};
