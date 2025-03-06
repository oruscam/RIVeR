import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { UIState, ScreenSizes } from './types'

const initialState: UIState = {
    screenSizes: {
        width: window.innerWidth,
        height: window.innerHeight, 
    },
    darkMode: true,
    error: [],
    isLoading: false,
    seeAll: false,
    language: 'en'
};

const uiSlice = createSlice({
    name: "ui",
    initialState,
    reducers: {
        changeTheme: (state) => {
            state.darkMode = !state.darkMode;
        },
        setErrorMessage: (state, action: PayloadAction<string[]>) => {
            const errorDiv = document.getElementById('error-message-div');
            if (errorDiv) {
                errorDiv.scrollIntoView({ behavior: 'smooth' });   
            }
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
        setMessage: (state, action: PayloadAction<string>) => {
            state.message = action.payload; 
        },
        clearMessage: (state) => {
            state.message = undefined;
        },
        setLanguage: ( state, action: PayloadAction<string> ) => {
            if ( action.payload === undefined ) return;
            state.language = action.payload;
        }
    }
});

export const {
    changeTheme,
    clearErrorMessage,
    clearMessage,
    setErrorMessage,
    setLoading,
    setMessage,
    setScreen,
    setSeeAll,
    setLanguage
} = uiSlice.actions;

export default uiSlice.reducer;
