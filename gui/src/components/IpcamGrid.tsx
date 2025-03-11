import { useEffect, useState, useMemo, useRef } from "react";
import { useMatrixSlice, useProjectSlice } from "../hooks";
import DataGrid, { SelectColumn } from "react-data-grid";
import { useTranslation } from "react-i18next";

interface Row {
    key: number;
    id: number;
    label: string;
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
    const ref = useRef<typeof DataGrid | null>(null);
    const [selectedRows, setSelectedRows] = useState<ReadonlySet<number>>(() => new Set());
    const [previousSelectedRows, setPreviousSelectedRows] = useState<ReadonlySet<number>>(() => new Set());
    
    const { ipcam, onChangeIpcamPointSelected, setIpcamPointPixelCoordinates, onChangeActiveImage } = useMatrixSlice();
    const { importedPoints, activePoint } = ipcam;

    const { video } = useProjectSlice();
    const { width, height } = video.data;

    const { t } = useTranslation(); 

    const rows = useMemo(() => {
        if (importedPoints === undefined) {
            return Array.from({ length: 10 }, (_, index) => ({
                key: index,
                id: index,
                label: '',
                x: 0,
                y: 0,
                X: 0,
                Y: 0,
                Z: 0,
            }));
        } else {
            return importedPoints.map((point, index) => ({
                key: index,
                id: index,
                label: point.label,
                x: point.x,
                y: point.y,
                X: point.X,
                Y: point.Y,
                Z: point.Z,
            }));
        }
    }, [importedPoints]);

    const columns = [
        { ...SelectColumn, name: 'select', cellClass: 'centered-cell', headerCellClass: 'select-cell header-fixed' },
        { key: 'label', name: t('ControlPoints3d.label'), cellClass: 'point-label-cell centered-cell label-cell', headerCellClass: 'centered-cell label-cell header-fixed', frozen: true },
        { key: 'X', name: t('ControlPoints3d.east'), cellClass: 'centered-cell common-cell', headerCellClass: 'centered-cell common-cell header-fixed' },
        { key: 'Y', name: t('ControlPoints3d.north'), cellClass: 'centered-cell common-cell', headerCellClass: 'centered-cell common-cell header-fixed' },
        { key: 'Z', name: 'Z', cellClass: 'centered-cell common-cell', headerCellClass: 'centered-cell common-cell header-fixed' },
        { key: 'x', name: 'x', cellClass: 'centered-cell common-cell', headerCellClass: 'centered-cell common-cell header-fixed' },
        { key: 'y', name: 'y', cellClass: 'centered-cell common-cell', headerCellClass: 'centered-cell common-cell header-fixed' },
    ];

    const handleCellClick = (cell: { row: any; column: any; }) => {
        const { row, column } = cell;

        if (column.key === 'select-row') {
            onChangeIpcamPointSelected({index: row.id});
        }

        if (column.key === 'label') {
            if (importedPoints && importedPoints[row.id].image !== undefined) {
                onChangeActiveImage(importedPoints[row.id].image!);
            }
            setIpcamPointPixelCoordinates({
                index: row.id,
                imageSize: {
                    width: width,
                    height: height
                }
            });
        }
    };

    const changeSelectRow = (rowIndex: number | undefined) => {
        if ( rowIndex === undefined ) return;
        if (ref.current) {
            // ref.current.scrollToCell( {idx: 1, rowIdx: rowIndex} );
            ref.current.selectCell( { idx: 1, rowIdx: rowIndex });
        }
    };

    useEffect(() => {
        if (importedPoints !== undefined) {
            const selectedRowIndices = importedPoints
                .map((point, index) => point.selected ? index : null)
                .filter(index => index !== null);
            setSelectedRows(new Set(selectedRowIndices));
            setPreviousSelectedRows(new Set(selectedRowIndices));
        }
        changeSelectRow(activePoint ? activePoint : undefined);
    }, [importedPoints]);

    // This use effect is used to trigger the action when all the points are selected or unselected
    // I don't identify some event to capture the click on the header select-cell
    // So, I'm using this useEffect to trigger the action when all the points are selected or unselected
    
    useEffect(() => {   
        if ( selectedRows.size === 44 || selectedRows.size === 0 ) {
            if ( selectedRows.size !== previousSelectedRows.size ) {
                onChangeIpcamPointSelected({ rowsIndex: selectedRows.size });
                setPreviousSelectedRows(selectedRows);
            }
        }
    }, [selectedRows.size, rows.length])


    return (
        <div className="grid-container mt-2 mb-2" id="ipcam-grid">
            <DataGrid
                columns={columns}
                rows={rows}
                selectedRows={selectedRows}
                onSelectedRowsChange={setSelectedRows}
                rowKeyGetter={rowKeyGetter}
                className={`grid ${importedPoints === undefined ? 'disabled' : ''}`}
                onCellClick={handleCellClick}
                ref={ref}
            />
        </div>
    );
};