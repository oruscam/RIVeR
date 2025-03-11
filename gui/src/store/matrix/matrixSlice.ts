import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { obliquePoints, MatrixState, setIpcamPointsInterface, setIpcamImagesInterface, setIpcamCustomPoint, cameraSolution, pixelSize } from "./types";
import { DEFAULT_POINTS } from "../../constants/constants";
import { Point } from "../../types";

const initialState: MatrixState = {
    pixelSize: {
        drawLine: false,
        dirPoints: [],
        rwPoints: DEFAULT_POINTS,
        size: 0,
        rwLength: 0,
        extraFields: false,
    },
    obliquePoints: {
        drawPoints: false,
        coordinates: [{x: 0, y: 0}, {x: 0, y: 0}, {x: 0, y: 0}, {x: 0, y: 0}],
        distances: {
            d12: 0,
            d41: 0,
            d23: 0,
            d34: 0,
            d13: 0,
            d24: 0,
        },
        isDefaultCoordinates: true,
        isDistancesLoaded: false,
    },
    ipcam: {
        pointsPath: undefined,
        imagesPath: undefined,
        importedPoints: undefined,
        importedImages: undefined,
        activeImage: undefined,
        activePoint: undefined,
        cameraSolution: undefined,
        hemisphere: 'southern-hemisphere',
        selectedCounter: 0,
    },
    hasChanged: false,
    isBackendWorking: false,
}

const matrixSlice = createSlice({
    name: 'matrixGenerator',
    initialState,
    reducers: {
        setObliquePoints: ( state, action: PayloadAction<obliquePoints> ) => {
            state.obliquePoints = action.payload;
        },
        setDrawPoints: ( state ) => {
            state.obliquePoints.drawPoints = !state.obliquePoints.drawPoints;
            state.obliquePoints.coordinates = [{x: 0, y: 0}, {x: 0, y: 0}, {x: 0, y: 0}, {x: 0, y: 0}];
            state.obliquePoints.distances = {
                d12: 0,
                d13: 0,
                d41: 0,
                d23: 0,
                d24: 0,
                d34: 0,
            },
            state.obliquePoints.isDefaultCoordinates = true
            state.obliquePoints.isDistancesLoaded = false
            state.obliquePoints.solution = undefined
        },
        setHasChanged: ( state, action: PayloadAction<boolean> ) => {
            state.hasChanged = action.payload
        },
        setIpcamPoints: ( state, action: PayloadAction<setIpcamPointsInterface> ) => {
            state.ipcam.importedPoints = action.payload.points;
            state.ipcam.selectedCounter = action.payload.counter;
            if ( action.payload.path !== undefined ){
                state.ipcam.pointsPath = action.payload.path;
            }
        },
        setIpcamImages: ( state, action: PayloadAction<setIpcamImagesInterface> ) => {
            state.ipcam.importedImages = action.payload.images
            state.ipcam.imagesPath = action.payload.path
            state.ipcam.activeImage = 0
            state.ipcam.activePoint = 0
        },
        setActiveImage: ( state, action: PayloadAction<number> ) => {
            state.ipcam.activeImage = action.payload
        },
        setCustomIpcamPoint: ( state, action: PayloadAction<setIpcamCustomPoint> ) => {
            if ( state.ipcam.importedPoints ){
                state.ipcam.importedPoints[action.payload.index] = action.payload.point
                state.ipcam.activePoint = action.payload.index
            }
        },
        setIpcamCameraSolution: ( state, action: PayloadAction<cameraSolution | undefined> ) => {
            state.ipcam.cameraSolution = action.payload
        },
        setIsBackendWorking: ( state, action: PayloadAction<boolean> ) => {
            state.isBackendWorking = action.payload
        },
        setHemispehere: ( state, action: PayloadAction<'southern-hemisphere' | 'northern-hemisphere'> ) => {
            state.ipcam.hemisphere = action.payload
        },
        resetMatrixSlice: ( state ) => {
            state.ipcam = initialState.ipcam
            state.obliquePoints = initialState.obliquePoints
            state.hasChanged = initialState.hasChanged
        },
        setPixelSizePoints: ( state, action: PayloadAction<{ points: Point[], type: string }> ) => {
            state.hasChanged = true;
            state.pixelSize.solution = undefined;

            if ( action.payload.type === 'dir' ){
                state.pixelSize.dirPoints =  action.payload.points
            } else {
                state.pixelSize.rwPoints = action.payload.points
            }
        },
        updatePixelSize: ( state, action: PayloadAction<pixelSize>) => {
            state.pixelSize = action.payload
            state.hasChanged = true
        },
    }
})

export const {
    resetMatrixSlice,
    setActiveImage,
    setCustomIpcamPoint,
    setDrawPoints,
    setHasChanged,
    setHemispehere,
    setIpcamCameraSolution,
    setIpcamImages,
    setIpcamPoints,
    setIsBackendWorking,
    setObliquePoints,
    setPixelSizePoints,
    updatePixelSize,
} = matrixSlice.actions

export default matrixSlice.reducer