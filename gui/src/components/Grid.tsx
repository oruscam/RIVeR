import DataGrid, {SelectColumn} from "react-data-grid"
import 'react-data-grid/lib/styles.css';
import { useState } from "react";

const columns = [
    {...SelectColumn, cellClass: 'centered-cell', headerCellClass: 'centered-cell'},
    { key: 'id', name: '#', cellClass: 'centered-cell', headerCellClass: 'centered-cell' },
    { key: 'x', name: 'x', cellClass: 'centered-cell', headerCellClass: 'centered-cell' },
    { key: 'd', name: 'd', cellClass: 'centered-cell', headerCellClass: 'centered-cell' },
    { key: 'A', name: 'A', cellClass: 'centered-cell', headerCellClass: 'centered-cell' },
    { key: 'V', name: 'V', cellClass: 'centered-cell', headerCellClass: 'centered-cell' },
    { key: 'Q', name: 'Q', cellClass: 'centered-cell', headerCellClass: 'centered-cell' },
]

const rows = [
    { id: 1, x: 0, d: 0.8, A: 3.2, V: 1.6, Q: 12.3, selected: true },
    { id: 2, },
    { id: 3, },
    { id: 4, },
    { id: 5, },
    { id: 6, },
    { id: 7, x: 0, d: 0.8, A: 3.2, V: 2.3, Q: 25.6 },
    { id: 8 },
]

const rowKeyGetter = (row) => {
    return row.id
}

export const Grid = () => {
    const [selectedRows, setSelectedRows] = useState((): ReadonlySet<number> => new Set([1,2,3,4,5,6,7]))



  return (
    <div className="grid-container mt-2 mb-2">
        <DataGrid columns={columns} rows={rows} selectedRows={selectedRows} onSelectedRowsChange={setSelectedRows} rowKeyGetter={rowKeyGetter}></DataGrid>
    </div>
  )
}
