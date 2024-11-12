import DataGrid, {SelectColumn} from "react-data-grid"
import 'react-data-grid/lib/styles.css';
import { useEffect, useMemo, useState } from "react";
import { useSectionSlice } from "../hooks";

const rowKeyGetter = (row) => {
    return row.id
}

export const Grid = () => {
    const [selectedRows, setSelectedRows] = useState((): ReadonlySet<number> => new Set())
    const { sections, activeSection, onChangeDataValues } = useSectionSlice();
    const { data, interpolated } = sections[activeSection];

    console.log('interpolated',interpolated)

    const getCellClass = ( row ) => {
        let cellClas = 'centered-cell';
        if ( !data?.check[row.id]) {
            if ( interpolated ){
                cellClas = 'centered-cell cell-red-values';
            } else {
                cellClas = 'centered-cell disabled-cell';
            }
        }
        return cellClas;
    }
    
    const columns = [
        {...SelectColumn, cellClass: 'centered-cell', headerCellClass: 'select-cell'},
        { key: 'id', name: '#', cellClass: 'centered-cell', headerCellClass: 'centered-cell' },
        { key: 'x', name: 'x', cellClass: 'centered-cell', headerCellClass: 'centered-cell' },
        { key: 'd', name: 'd', cellClass: 'centered-cell', headerCellClass: 'centered-cell' },
        { key: 'A', name: 'A', cellClass: 'centered-cell', headerCellClass: 'centered-cell' },
        { key: 'Vs', name: 'Vs', cellClass: getCellClass, headerCellClass: 'centered-cell' },
        { key: 'Q', name: 'Q', cellClass: getCellClass, headerCellClass: 'centered-cell' },
    ]

    const handleCellClick = ( cell: { row: any; column: any; } ) => {
        const { row, column } = cell;
        if( column.key === 'select-row'){
            onChangeDataValues({
                type: 'check',
                rowIndex: row.id,
            })
        }
    }

    const rows = useMemo(() => {
        const section = sections[activeSection];
        if (section && section.data) {
            const { num_stations, distance, depth, streamwise_velocity_magnitude, Q, A, check } = section.data;


            return Array.from({ length: num_stations }, (_, i) => ({
                key: i,
                id: i,
                x: typeof distance[i] === 'number' ? distance[i].toFixed(2) : '-',
                d: typeof depth[i] === 'number' ? depth[i].toFixed(2) : '-',
                A: typeof A[i] === 'number' ? A[i].toFixed(2) : '-',
                Vs: typeof streamwise_velocity_magnitude[i] === 'number' ? 
                    (check[i] || interpolated ? streamwise_velocity_magnitude[i].toFixed(2) : '-') : '-',
                Q: typeof Q[i] === 'number' ? 
                    (check[i] || interpolated ? Q[i].toFixed(2) : '-') : '-'
            }));
        }
        return [];
    }, [sections, activeSection]);


    useEffect(() => {
        const section = sections[activeSection];
        if (section && section.data && Array.isArray(section.data.check)) {
          const selectedRowIndices = section.data.check
            .map((isSelected, index) => isSelected ? index : null)
            .filter(index => index !== null);
          setSelectedRows(new Set(selectedRowIndices));
        }
      }, [sections, activeSection]);



  return (
    <div className="grid-container mt-2 mb-2">
        <DataGrid   className="grid" 
                    columns={columns} 
                    rows={rows} 
                    selectedRows={selectedRows} 
                    onSelectedRowsChange={setSelectedRows} 
                    rowKeyGetter={rowKeyGetter} 
                    onCellClick={handleCellClick}
                    enableVirtualization={true}
                    ></DataGrid>
    </div>
  )
}
