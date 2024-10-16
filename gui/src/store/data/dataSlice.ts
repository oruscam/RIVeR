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
    isBackendWorking: false, // this flag is not used
    form: defaultFormProcessing, 
    parImages: ['', '1', '', '2'],
    maskPath: '/@fs/home/tomy_ste/River/DJI_0036/mask.png'
}

const initialState: DataState = {
    processing: defaultProcessing,
    images: {
        paths: [],
        active: 0
    },
    analizing: false 
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
            state.analizing = action.payload
        },
        setProcessingMask: (state, action: PayloadAction<string>) => {
            state.processing.maskPath = action.payload  + `?t=${new Date().getTime()}`;
        },
        setImages: (state, action: PayloadAction<string[]>) => {
            state.images.paths = action.payload
        },
        setActiveImage: ( state, action: PayloadAction<number>) => {
            state.images.active = action.payload
        },
        setQuiver: (state, action: PayloadAction<Quiver | undefined>) => {
            state.quiver = action.payload
        },
        updateAnalizing: (state, action: PayloadAction<boolean>) => {
            state.analizing = action.payload
        },

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
} = dataSlice.actions

export default dataSlice.reducer