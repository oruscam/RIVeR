/**
 * @file: useDataSlice.ts
 * @description: This hook is used to interact with the data slice of the store
 */

import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../store/store";
import { updateProcessingPar, setActiveImage, updateProcessingForm, setBackendWorkingFlag, setQuiver } from "../store/data/dataSlice";
import { clearErrorMessage, setErrorMessage } from "../store/ui/uiSlice";
import { Quiver } from "../store/data/types";

/**
 * @returns - Object with the methods and attributes to interact with the data slice
 */

export const useDataSlice = () => {
    const dispatch = useDispatch();
    const { processing, images, quiver } = useSelector((state: RootState) => state.data);
    
    
    interface ProcessingValues {
        artificialSeeding?: boolean;
        clahe?: boolean;
        clipLimit?: string;
        grayscale?: boolean;
        images?: string[];
        medianTestEpsilon?: string;
        medianTestFiltering?: boolean;
        medianTestThreshold?: string;
        removeBackground?: boolean;
        stdFiltering?: boolean;
        stdThreshold?: number;
        step1?: number;
        step2?: number;
    }

    /**
     * Method to update the processing slice.
     * Depending on the values of the object, it will update the images or the step1 attribute.
     * @param value - Object with the values to update the processing slice
     */

    const onUpdateProcessing = (value: ProcessingValues) => {
        const updatedForm = { ...processing.form };

        Object.keys(value).forEach(key => {
            const typedKey = key as keyof ProcessingValues;
            if (value[typedKey] !== undefined) {
                updatedForm[typedKey] = value[typedKey];
            }
        });
    
        dispatch(updateProcessingForm(updatedForm));

        if (value.images) {
            dispatch(updateProcessingPar(value.images));
        }
    }

    /**
     * Method to set the active image.
     * @param value - Number with the index of the image to set as active
     */

    const onSetActiveImage = (value: number) => {
        dispatch(setActiveImage(value))
    }

    /**
     * Method to get the quiver test.
     * It will set the processing to true while the quiver is being processed.
     * Once the quiver is obtained, it will set the quiver and the processing to false.
     * If an error occurs, it will be logged.
     * @returns - Object with the quiver values
     */

    const onSetQuiverTest = async () => {
        dispatch(setBackendWorkingFlag(true))
        const ipcRenderer = window.ipcRenderer;

        const { paths, active } = images;
        const framesToTest = [paths[active], paths[active + 1]]

        try {
            const { data, error } = await ipcRenderer.invoke('get-quiver-test', {framesToTest: framesToTest, formValues: processing.form})

            if ( error.message ){
                dispatch(setErrorMessage([error.message]))
                setTimeout(() => {
                    dispatch(clearErrorMessage())
                }, 4000)
            } else {
                dispatch(setQuiver(
                    {
                        x: data.x,
                        y: data.y,
                        u: data.u,
                        v: data.v,
                        typevector: data.typevector,
                        u_median: data.u_median,
                        v_median: data.v_median
                    }
                ))
            }

            dispatch(setBackendWorkingFlag(false))
        } catch (error) {
            console.log(error)
            dispatch(setBackendWorkingFlag(false))
            dispatch(setErrorMessage(["Sorry, something went wrong"]))
            setTimeout(() => {
                dispatch(clearErrorMessage())
            }, 4000)
        }
    }

    /**
     * Method to get the quiver of all the images.
     * It will set the processing to true while the quiver is being processed.
     * Once the quiver is obtained, it will set the quiver and the processing to false.
     * If an error occurs, it will be logged.
     * @returns - Object with the quiver values
     */

    const onSetQuiverAll = async () => {
        dispatch(setBackendWorkingFlag(true))
        const ipcRenderer = window.ipcRenderer;

        try {
            const { data, error} = await ipcRenderer.invoke('get-quiver-all', {formValues: processing.form})

            console.log(data)
            console.log(error)

            if ( error.message ){
                dispatch(setErrorMessage([error.message]))
                setTimeout(() => {
                    dispatch(clearErrorMessage())
                }, 4000)
            } else {
                dispatch(setQuiver(
                    {
                        x: data.x,
                        y: data.y,
                        u: data.u,
                        v: data.v,
                        typevector: data.typevector,
                        u_median: data.u_median,
                        v_median: data.v_median
                    }
                ))
            }

            dispatch(setBackendWorkingFlag(false))
        } catch (error) {
            console.log(error)
            dispatch(setBackendWorkingFlag(false))
            dispatch(setErrorMessage(["Sorry, something went wrong"]))
            setTimeout(() => {
                dispatch(clearErrorMessage())
            }, 4000)
        }
    }

    const onKillBackend = async () => {
        const ipcRenderer = window.ipcRenderer;
        await ipcRenderer.invoke('kill-python-shell')
        dispatch(setBackendWorkingFlag(false))
    }

    const onClearQuiver = () => {
        dispatch(setQuiver(undefined))
    }


    return {
        // ATRIBUTES
        images,
        processing,
        quiver,
        // METHODS
        onSetActiveImage,
        onSetQuiverTest,
        onUpdateProcessing,
        onSetQuiverAll,
        onClearQuiver,
        onKillBackend
    }
}