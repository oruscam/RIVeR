import { useEffect, useState } from "react";
import { useMatrixSlice, useProjectSlice } from "../hooks"
import DataGrid, { SelectColumn } from "react-data-grid"

interface Row {
    key: number;
    id: number;
    x: number;
    y: number;
    X: number;
    Y: number;
    Z: number;
}

const rowKeyGetter = (row: Row): number => {
    return row.id;
}

export const IpcamGrid = () => {
    const [selectedRows, setSelectedRows] = useState((): ReadonlySet<number> => new Set())
    
    const { ipcam, changeIpcamPointSelected, setIpcamPointPixelCoordinates, onChangeActiveImage } = useMatrixSlice();
    const { importedPoints } = ipcam;

    const { video } = useProjectSlice()
    const { width, height } = video.data

    let rows

    if ( importedPoints === undefined ){
        rows = Array.from({ length: 10 }, (_, index) => {
            return {
                key: index,
                id: index,
                label: '',
                x: 0,
                y: 0,
                X: 0,
                Y: 0,
                Z: 0,
            }
        })

    } else {
        rows = importedPoints.map((point, index) => {
            return {
                key: index,
                id: index,
                label: point.label,
                x: point.x,
                y: point.y,
                X: point.X,
                Y: point.Y,
                Z: point.Z,
            }
        })
    }

    const columns = [
        { ...SelectColumn, cellClass: 'centered-cell', headerCellClass: 'select-cell' },
        { key: 'label', name: 'Label', cellClass: 'point-label-cell centered-cell', headerCellClass: 'centered-cell' },
        { key: 'x', name: 'x', cellClass: 'centered-cell', headerCellClass: 'centered-cell' },
        { key: 'y', name: 'y', cellClass: 'centered-cell', headerCellClass: 'centered-cell' },
    ]

    const handleCellClick = ( cell: { row: any; column: any; } ) => {
        const { row, column } = cell;

        if ( column.key === 'select-row' ){
            changeIpcamPointSelected(row.id)
        }

        if ( column.key === 'label') {
            if ( importedPoints && importedPoints[row.id].image !== undefined ){
                onChangeActiveImage(importedPoints[row.id].image!)
            }
            setIpcamPointPixelCoordinates({
                index: row.id,
                imageSize: {
                    width: width,
                    height: height
                }
            })
        }
    }
            
    useEffect(() => {
        if ( importedPoints !== undefined ){
        const selectedRowIndices = importedPoints
            .map((point, index) => point.selected ? index : null)
            .filter(index => index !== null);
          setSelectedRows(new Set(selectedRowIndices));
        }
    }, [importedPoints])


    return (
        <div className="grid-container mt-2 mb-2" id="ipcam-grid">
            <DataGrid
                columns={columns}
                rows={rows}
                selectedRows={selectedRows}
                onSelectedRowsChange={setSelectedRows}
                rowKeyGetter={rowKeyGetter}
                className="grid"
                onCellClick={handleCellClick}
            />
        </div>
    )
}