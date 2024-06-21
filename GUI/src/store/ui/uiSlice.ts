import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {UIState, VideoData, Section, Point, ScreenSizes, Bathimetry, VideoForm} from './types'

const initialState: UIState = {
    screenSizes: {
        width: window.innerWidth,
        height: window.innerHeight, 
    },
    darkMode: true,
    video: null,
    error: [],
    isLoading: false,
    sections: [{
            name: "pixel_size",
            drawLine: false,
            points: [],
            bathimetry: {
                bathimetryFile: false,
                level: 0
            },
        },
        {
            name: "CS_default-1",
            drawLine: false,
            points: [],
            bathimetry: {
                bathimetryFile: false,
                level: 0
            },
        }
    ],
    activeSection: 0,
    seeAll: false,
    videoForm: false
};

const uiSlice = createSlice({
    name: "ui",
    initialState,
    reducers: {
        changeTheme: (state) => {
            state.darkMode = !state.darkMode;
        },
        uploadFile: (state, action: PayloadAction<VideoData>) => {
            state.video = action.payload;
        },
        setErrorMessage: (state, action: PayloadAction<string[]>) => {
            state.error = action.payload;
        },
        clearErrorMessage: (state) => {
            state.error = [];
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
        setScreen: (state, action: PayloadAction<ScreenSizes>) => {
            state.screenSizes = action.payload;
        },

        // * UNIFICAR
        addSection: (state, action: PayloadAction<Section>) => {
            state.sections.push(action.payload);
        },
        deleteSection: (state, action: PayloadAction<number>) => {
            state.sections.splice(action.payload, 1);
        },
        setActiveSection: (state, action: PayloadAction<number>) => {
            state.activeSection = action.payload;
        },
        changeNameSection: (state, action: PayloadAction<string>) => {
            state.sections[state.activeSection].name = action.payload;
        },
        // */

        //* Unificar -> quizas setDrawLine y setPoints y bathimetry deberian ser parte del dataSlice
        setDrawLine: (state) => {
            state.sections[state.activeSection].drawLine = !state.sections[state.activeSection].drawLine;
        },
        setPoints: (state, action: PayloadAction<Point[]>) => {
            state.sections[state.activeSection].points = action.payload;
        },
        setSeeAll: (state) => {
            state.seeAll = !state.seeAll;
        },

        setBathimetry: (state, action: PayloadAction<Bathimetry>) => {
            state.sections[state.activeSection].bathimetry = action.payload
        },
        //* /


        // ! Mover a DATA SLICE. Todo lo que venga del back debería guardarse ahí.
        setVideoForm: (state, action: PayloadAction<VideoForm>) => {
            state.videoForm = action.payload;
        },
        setVideoFrame: (state, action: PayloadAction<string>) => {
            state.video!.firstFrame = action.payload;
        }
    }
});

export const {
    changeTheme,
    uploadFile,
    setErrorMessage,
    clearErrorMessage,
    setLoading,
    setActiveSection,
    addSection,
    deleteSection,
    changeNameSection,
    setDrawLine,
    setPoints,
    setSeeAll,
    setScreen,
    setBathimetry,
    setVideoForm,
    setVideoFrame
} = uiSlice.actions;

export default uiSlice.reducer;
