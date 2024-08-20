/**
 * @file: useDataSlice.ts
 * @description: This hook is used to interact with the data slice of the store
 */

import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../store/store";
import { updateProcessingPar, setActiveImage, updateProcessingForm, setProcessingTest, setQuiver } from "../store/data/dataSlice";
import { Quiver } from "../store/data/types";
import { setLoading } from "../store/ui/uiSlice";

/**
 * @returns - Object with the methods and attributes to interact with the data slice
 */

export const useDataSlice = () => {
    const dispatch = useDispatch();
    const { processing, images, quiver } = useSelector((state: RootState) => state.data);

    interface ProcessingValues {
        images?: string[];
        step1?: number;
    }

    /**
     * Method to update the processing slice.
     * Depending on the values of the object, it will update the images or the step1 attribute.
     * @param value - Object with the values to update the processing slice
     */

    const onUpdateProccesing = (value: ProcessingValues) => {
        if (value.images) {
            dispatch(updateProcessingPar(value.images));
        }
        if (value.step1) {
            dispatch(updateProcessingForm({ ...processing.form, step1: value.step1 }));
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
        dispatch(setProcessingTest(true))
        const ipcRenderer = window.ipcRenderer;

        try {
            const data: Quiver = await ipcRenderer.invoke('get-quiver-test')

            dispatch(setQuiver(data))
            dispatch(setProcessingTest(false))
        } catch (error) {
            console.log(error)
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
        dispatch(setLoading(true))
        const ipcRenderer = window.ipcRenderer;

        try {
            const data: Quiver = await ipcRenderer.invoke('get-quiver-all')
            
            if( quiver?.x ){
                dispatch(setQuiver({
                    ...quiver, u: data.u, v: data.v, u_median: data.u_median, v_median: data.v_median
                }))
            } else {
                dispatch(setQuiver(data))
            }
            dispatch(setLoading(false))
        } catch (error) {
            console.log(error)
        }
    }


    return {
        // ATRIBUTES
        images,
        processing,
        quiver,
        // METHODS
        onSetActiveImage,
        onSetQuiverTest,
        onUpdateProccesing,
        onSetQuiverAll
    }
}