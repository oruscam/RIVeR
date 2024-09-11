 /**
 * @file useUiSlice.ts
 * @description This file contains the custom hook for the UI slice.
 */

import { useDispatch, useSelector } from "react-redux";
import { changeTheme, setErrorMessage, clearErrorMessage, setSeeAll, setScreen } from "../store/ui/uiSlice";
import { RootState } from "../store/store";
import { ScreenSizes } from '../store/ui/types'

/**
 * @returns - Object with the methods and attributes to interact with the ui slice
 */

export const useUiSlice = () => {
    const { darkMode, error, isLoading, seeAll, screenSizes} = useSelector((state: RootState) => state.ui);
    const dispatch = useDispatch();

    /**
     * Method to change the theme of the application
     */

    const onChangeTheme = () => {
        dispatch(changeTheme());
    };

    /**
     * Method to set the error message on the UI slice.
     * After 4 seconds the error message will be cleared.
     * @param error - String with the error message
     * @param error - Object with the error message
     */

    const onSetErrorMessage = (error: Record<string, { type: string, message: string } | string>) => {
        if (typeof error === 'string') {
            dispatch(setErrorMessage([error]));
        } else {
            let arrayOfErrors: string[] = [];
            if (error !== undefined) {
                Object.entries(error).every(([, value]) => {
                    if (typeof value === 'string') {
                        arrayOfErrors.push(value);
                    } else if (value && value.type === 'required') {
                        arrayOfErrors = [value.message];
                        return false;
                    } else if (value) {
                        arrayOfErrors.push(value.message);
                    }
                    return true;
                });
                dispatch(setErrorMessage(arrayOfErrors));
            }
        }
        setTimeout(() => {
            dispatch(clearErrorMessage());
        }, 4000);
    };

    /**
     * Method to set the seeAll attribute to true.
     * seeAll corresponds to the eye in FormCrossSctions, Step 5.
     * When seeAll is true, the user can see all the cross sections.
     * By default is true
     */

    const onSetSeeAll = () => {
        dispatch(setSeeAll());
    }

    /**
     * Method to set the screen sizes on the UI slice.
     * @param screen - Object with the screen sizes
     */

    const onSetScreen = (screen: ScreenSizes) => {
        dispatch(setScreen(screen))
    }


    return {
        // ATRIBUTES
        darkMode,
        error,
        isLoading,
        seeAll,
        screenSizes,

        // METHODS
        onChangeTheme,
        onSetErrorMessage,
        onSetSeeAll,
        onSetScreen,
    };
};
