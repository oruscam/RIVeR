import { useDispatch, useSelector } from "react-redux";
import { changeTheme, setErrorMessage, clearErrorMessage, setLoading, setSeeAll, setScreen } from "../store/ui/uiSlice";
import { RootState } from "../store/store";
import { ScreenSizes } from '../store/ui/types'

export const useUiSlice = () => {
    const { darkMode, video, error, isLoading, seeAll, screenSizes} = useSelector((state: RootState) => state.ui);
    const dispatch = useDispatch();

    const onChangeTheme = () => {
        dispatch(changeTheme());
    };


    const onSetErrorMessage = (error: Record<string, { type: string, message: string } | string>) => {
        if(typeof error === 'string'){
            dispatch(setErrorMessage([error]));
        } else {
            let arrayOfErrors: string[] = [];
            if( error !== undefined) {
                Object.entries(error).every(([, value]) => {
                    if (typeof value === 'string') {
                        arrayOfErrors.push(value);
                    } else if (value.type === 'required') {
                        arrayOfErrors = [value.message];
                        return false;
                    } else {
                        arrayOfErrors.push(value.message);
                    }
                });
                dispatch(setErrorMessage(arrayOfErrors));
            }
            }
        setTimeout(() => {
            dispatch(clearErrorMessage());
        }, 4000);
    };

    const onSetSeeAll = () => {
        dispatch(setSeeAll());
    }

    const onSetScreen = (screen: ScreenSizes) => {
        dispatch(setScreen(screen))
    }



    return {
        // ATRIBUTES
        darkMode,
        video,
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
