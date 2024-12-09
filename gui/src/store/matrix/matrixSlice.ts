import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { controlPoints, MatrixState, pixelSize } from "./types";

const initialState: MatrixState = {
    pixelSize: {
        drawLine: false,
        pixelPoints: [{x: 0, y: 0}, {x: 0, y: 0}],
        rwPoints: [{x: 0, y: 0}, {x: 0, y: 0}],
        pixelSize: 0,
        rwLength: 0,
    },
    controlPoints: {
        drawPoints: false,
        coordinates: [{x: 0, y: 0}, {x: 0, y: 0}, {x: 0, y: 0}, {x: 0, y: 0}],
        distances: {
            d12: 0,
            d13: 0,
            d14: 0,
            d23: 0,
            d24: 0,
            d34: 0,
        },
        isNotDefaultCoordinates: false
    }
}

const matrixSlice = createSlice({
    name: 'matrixGenerator',
    initialState,
    reducers: {
        setPixelSize: ( state, action: PayloadAction<pixelSize> ) => {
            state.pixelSize = action.payload;
        },
        setControlPoints: ( state, action: PayloadAction<controlPoints> ) => {
            state.controlPoints = action.payload;
        },
        setDrawPoints: ( state ) => {
            state.controlPoints.drawPoints = !state.controlPoints.drawPoints;
            state.controlPoints.coordinates = [{x: 0, y: 0}, {x: 0, y: 0}, {x: 0, y: 0}, {x: 0, y: 0}];
            state.controlPoints.distances = {
                d12: 0,
                d13: 0,
                d14: 0,
                d23: 0,
                d24: 0,
                d34: 0,
            }
        }
    }
})

export const {
    setPixelSize,
    setControlPoints,
    setDrawPoints
} = matrixSlice.actions

export default matrixSlice.reducer