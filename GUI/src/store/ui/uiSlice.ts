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
    seeAll: false,

};

const uiSlice = createSlice({
    name: "ui",
    initialState,
    reducers: {
        changeTheme: (state) => {
            state.darkMode = !state.darkMode;
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

        setSeeAll: (state) => {
            state.seeAll = !state.seeAll;
        },

    }
});

export const {
    changeTheme,
    setErrorMessage,
    clearErrorMessage,
    setLoading,
    setScreen,
    setSeeAll
} = uiSlice.actions;

export default uiSlice.reducer;
