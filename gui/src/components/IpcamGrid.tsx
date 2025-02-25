import { useEffect, useState, useMemo } from "react";
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
    const [selectedRows, setSelectedRows] = useState<ReadonlySet<number>>(() => new Set());
    
    const { ipcam, changeIpcamPointSelected, setIpcamPointPixelCoordinates, onChangeActiveImage } = useMatrixSlice();
    const { importedPoints } = ipcam;

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
        { ...SelectColumn, cellClass: 'centered-cell', headerCellClass: 'select-cell' },
        { key: 'label', name: 'Label', cellClass: 'point-label-cell centered-cell label-cell', headerCellClass: 'centered-cell label-cell', frozen: true },
        { key: 'X', name: t('Ipcam.east'), cellClass: 'centered-cell common-cell', headerCellClass: 'centered-cell common-cell' },
        { key: 'Y', name: t('Ipcam.north'), cellClass: 'centered-cell common-cell', headerCellClass: 'centered-cell common-cell' },
        { key: 'Z', name: 'Z', cellClass: 'centered-cell common-cell', headerCellClass: 'centered-cell common-cell' },
        { key: 'x', name: 'x', cellClass: 'centered-cell common-cell', headerCellClass: 'centered-cell common-cell' },
        { key: 'y', name: 'y', cellClass: 'centered-cell common-cell', headerCellClass: 'centered-cell common-cell' },
    ];

    const handleCellClick = (cell: { row: any; column: any; }) => {
        const { row, column } = cell;

        if (column.key === 'select-row') {
            changeIpcamPointSelected(row.id);
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

    useEffect(() => {
        if (importedPoints !== undefined) {
            const selectedRowIndices = importedPoints
                .map((point, index) => point.selected ? index : null)
                .filter(index => index !== null);
            setSelectedRows(new Set(selectedRowIndices));
        }
    }, [importedPoints]);

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
            />
        </div>
    );
};