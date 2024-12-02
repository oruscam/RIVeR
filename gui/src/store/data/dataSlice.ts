import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { DataState, FormProcessing, Quiver } from "./types";

const defaultFormProcessing = {
    artificialSeeding: false,
    clahe: true,
    clipLimit: 5,
    grayscale: true,
    heightRoi: 0,
    medianTestEpsilon: 0.02,
    medianTestFiltering: true,
    medianTestThreshold: 2,
    removeBackground: false,
    stdFiltering: true,
    stdThreshold: 4,
    step1: 128,
    step2: 64,
}

const defaultProcessing = {
    form: defaultFormProcessing, 
    parImages: ['', '1', '', '2'],
    maskPath: ''
}

const initialState: DataState = {
    processing: defaultProcessing,
    images: {
        paths: [],
        active: 0,
    },
    isBackendWorking: false,
    isDataLoaded: false,
}

const dataSlice = createSlice({
    name: 'data',
    initialState,
    reducers: {
        updateProcessingForm: (state, action: PayloadAction<FormProcessing>) => {
            state.processing.form = action.payload
        },
        updateProcessingPar: (state, action: PayloadAction<string[]>) => {
            state.processing.parImages = action.payload
        },
        setBackendWorkingFlag: (state, action: PayloadAction<boolean>) => { 
            state.isBackendWorking = action.payload
        },
        setProcessingMask: (state, action: PayloadAction<string>) => {
            state.processing.maskPath = action.payload  + `?t=${new Date().getTime()}`;            
        },
        setImages: (state, action: PayloadAction<{paths: string[]}>) => {
            state.images.paths = action.payload.paths
        },
        setActiveImage: ( state, action: PayloadAction<number>) => {
            state.images.active = action.payload
        },
        setQuiver: (state, action: PayloadAction<Quiver | undefined>) => {
            state.quiver = action.payload
        },
        setDataLoaded: (state, action: PayloadAction<boolean>) => {
            state.isDataLoaded = action.payload
        }
    }
})

export const {
    setActiveImage,
    setImages,
    setProcessingMask,
    setBackendWorkingFlag,
    setQuiver,
    updateProcessingForm,
    updateProcessingPar,
    setDataLoaded
} = dataSlice.actions

export default dataSlice.reducer