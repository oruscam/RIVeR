import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { obliquePoints, MatrixState, pixelSize } from "./types";

const initialState: MatrixState = {
    pixelSize: {
        drawLine: false,
        pixelPoints: [{x: 0, y: 0}, {x: 0, y: 0}],
        rwPoints: [{x: 0, y: 0}, {x: 0, y: 0}],
        pixelSize: 0,
        rwLength: 0,
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
        isDefaultCoordinates: true
    },
    hasChanged: false,
}

const matrixSlice = createSlice({
    name: 'matrixGenerator',
    initialState,
    reducers: {
        setPixelSize: ( state, action: PayloadAction<pixelSize> ) => {
            state.pixelSize = action.payload;
        },
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
        },
        setHasChanged: ( state, action: PayloadAction<boolean> ) => {
            console.log('HasChanged en setHasChanged', action.payload)
            state.hasChanged = action.payload
        }
    }
})

export const {
    setPixelSize,
    setObliquePoints,
    setDrawPoints,
    setHasChanged
} = matrixSlice.actions

export default matrixSlice.reducer