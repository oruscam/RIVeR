import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { obliquePoints, MatrixState, setIpcamPointsInterface, setIpcamImagesInterface, setIpcamCustomPoint, cameraSolution } from "./types";

const initialState: MatrixState = {
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
        isCalculating: false,
    },
    hasChanged: false,
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
        },
        setHasChanged: ( state, action: PayloadAction<boolean> ) => {
            state.hasChanged = action.payload
        },
        setIpcamPoints: ( state, action: PayloadAction<setIpcamPointsInterface> ) => {
            state.ipcam.importedPoints = action.payload.points;
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
            console.log('setCustomIpcamPoint', action)
            if ( state.ipcam.importedPoints ){
                state.ipcam.importedPoints[action.payload.index] = action.payload.point
                state.ipcam.activePoint = action.payload.index
            }
        },
        setIpcamCameraSolution: ( state, action: PayloadAction<cameraSolution | undefined> ) => {
            state.ipcam.cameraSolution = action.payload
        },
        setIpcamIsCalculating: ( state, action: PayloadAction<boolean> ) => {
            state.ipcam.isCalculating = action.payload
        },
        setHemispehere: ( state, action: PayloadAction<'southern-hemisphere' | 'northern-hemisphere'> ) => {
            state.ipcam.hemisphere = action.payload
        },
        resetMatrixSlice: ( state ) => {
            state.ipcam = initialState.ipcam
            state.obliquePoints = initialState.obliquePoints
            state.hasChanged = initialState.hasChanged
        }
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
    setIpcamIsCalculating,
    setIpcamPoints,
    setObliquePoints,
} = matrixSlice.actions

export default matrixSlice.reducer