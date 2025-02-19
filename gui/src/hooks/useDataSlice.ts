/**
 * @file: useDataSlice.ts
 * @description: This hook is used to interact with the data slice of the store
 */

import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../store/store";
import { updateProcessingPar, setActiveImage, updateProcessingForm, setBackendWorkingFlag, setQuiver, setProcessingMask, setDataLoaded, setImages, resetDataSlice } from "../store/data/dataSlice";
import { clearMessage, setLoading, setMessage } from "../store/ui/uiSlice";
import { setSectionData, setSummary } from "../store/section/sectionSlice";
import { CliError } from "../errors/errors";
import { useTranslation } from "react-i18next";
import { verifyWindowsSizes } from "../helpers";

/**
 * @returns - Object with the methods and attributes to interact with the data slice
 */

export const useDataSlice = () => {
    const dispatch = useDispatch();
    const { processing, images, quiver, isBackendWorking, isDataLoaded, hasChanged } = useSelector((state: RootState) => state.data);
    const { sections, activeSection } = useSelector((state: RootState) => state.section);
    const { video } = useSelector((state: RootState) => state.project);

    const { t } = useTranslation()
    
    const filePrefix = import.meta.env.VITE_FILE_PREFIX;
    

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
        heightRoi?: number;
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
                if ( typedKey === 'step1' ) {
                    updatedForm['step2'] = value[typedKey] / 2
                }
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

    const onSetActiveImage = async (value: number) => {
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
        const { bbox, form } = processing
        const { paths, active } = images;
        const framesToTest = [paths[active], paths[ active + 1]]

        try {  
            const result = verifyWindowsSizes(form.step1, bbox ? bbox : false)
            if ( result ) {
                throw new Error((result.message))
            }

            const { data, error } = await ipcRenderer.invoke('get-quiver-test', { framesToTest: framesToTest, formValues: form })

            if ( error?.message ){
                throw new Error(error.message)
            } else {
                dispatch(setQuiver({
                    quiver: {
                        x: data.x,
                        y: data.y,
                        u: data.u,
                        v: data.v,
                        typevector: data.typevector,
                        u_median: data.u_median,
                        v_median: data.v_median
                    },
                    test: true
                }))
            }

            dispatch(setBackendWorkingFlag(false))
        } catch (error) {
            console.log(error)
            dispatch(setBackendWorkingFlag(false))
            if ( error instanceof Error){
                throw new CliError(error.message, t)
            }
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
            const { data, error } = await ipcRenderer.invoke('get-quiver-all', { formValues: processing.form })

            if ( error?.message ){
                throw new Error(error.message)
            } else {
                const { x, y, u, v, typevector, u_median, v_median } = data
                dispatch(setQuiver({
                    quiver: {
                        x: x,
                        y: y,
                        u: u,
                        v: v,
                        typevector: typevector,
                        u_median: u_median,
                        v_median: v_median
                    },
                    test: false
                }))
            }
            dispatch(setBackendWorkingFlag(false))
        } catch (error) {
            dispatch(setBackendWorkingFlag(false))
            if ( error instanceof Error){
                throw new CliError(error.message, t)
            }
        }
    }

    const onKillBackend = async () => {
        const ipcRenderer = window.ipcRenderer;
        
        const environment = process.env.NODE_ENV

        const handler = environment === 'development' ? 'kill-river-cli' : 'kill-river-cli'
        
        try {
            await ipcRenderer.invoke(handler)
            dispatch(setBackendWorkingFlag(false))
            return true
        } catch (error) {
            console.log(error)
            return false
        }
    }

    // type can be 'single' or 'all'

    const onGetResultData = async ( type : string ) => {
        if (isBackendWorking) return
        
        const ipcRenderer = window.ipcRenderer;
        dispatch(setBackendWorkingFlag(true))
        dispatch(setMessage('Generating velocity profile statistics'))

        if ( type === 'single' ){
            const section = sections[activeSection]
            try {
                const { data, error } = await ipcRenderer.invoke('get-results-single', {step: video.parameters.step, fps: video.data.fps, sectionIndex: activeSection - 1, alpha: section.alpha, num_stations: section.numStations, interpolated: section.interpolated, activeCheck : section.data?.activeCheck, name: section.name, showVelocityStd: section.data?.showVelocityStd, showPercentile: section.data?.showPercentile, artificialSeeding: section.artificialSeeding })
                
                if ( error?.message ){
                    throw new Error(error.message)
                }
                
                dispatch(setSectionData({
                    sectionIndex: activeSection,
                    sectionData: {
                        ...data[section.name],
                        activeCheck: data[section.name].check
                    }
                }))
                dispatch(setSummary(data.summary))
                dispatch(setBackendWorkingFlag(false))
            } catch ( error ){
                dispatch(setBackendWorkingFlag(false))
                if ( error instanceof Error) {
                    throw new CliError(error.message, t)
                }
                dispatch(clearMessage())
            }
        } else {
            dispatch(setLoading(true))

            try {
                const { data, error } = await ipcRenderer.invoke('get-results-all', {step: video.parameters.step, fps: video.data.fps, numSections: sections.length - 1})
                
                if ( error?.message ) {
                    throw new Error(error)
                }                

                sections.map(( section, index ) => {
                    if ( data[section.name] ){
                        dispatch(setSectionData({
                            sectionIndex: index,
                            sectionData: {
                                ...data[section.name],
                                activeCheck: data[section.name].check
                            }
                        }))
                }})
                dispatch(setSummary(data.summary))
                dispatch(setDataLoaded(true))
                dispatch(setLoading(false))
                dispatch(setBackendWorkingFlag(false))
            } catch (error) {
                dispatch(setLoading(false))
                dispatch(setBackendWorkingFlag(false))
                if ( error instanceof Error) {
                    throw new CliError(error.message, t)
                }
                dispatch(clearMessage())
            }
        }
    }

    const onClearQuiver = (previous?: boolean) => {
        if ( hasChanged || previous === true) {
            dispatch(setQuiver({quiver: undefined, test: false}))
        }
    }

    const onReCalculateMask = async ( value: number ) => {
        dispatch(setBackendWorkingFlag(true))    
        onClearQuiver()
        
        const ipcRenderer = window.ipcRenderer;

        try {
            const { maskPath, bbox, error } = await ipcRenderer.invoke('create-mask-and-bbox', { height_roi: value, data: isDataLoaded })
            console.log('error mask', error)

            if ( error?.message ){
                throw new Error(error.message)
            }

            dispatch(setProcessingMask({mask: filePrefix + maskPath, bbox}))
            dispatch(setBackendWorkingFlag(false))
        } catch (error) {
            dispatch(setBackendWorkingFlag(false))
            if ( error instanceof Error){
                throw new CliError(error.message, t)
            }
        }
    }

    const onSetAnalizing = ( value : boolean) => {
        dispatch(setBackendWorkingFlag(value))
    }

    const onSetImages = ( paths: string[], clean?: boolean) => {
        dispatch(setImages({ paths: paths }));  
        
        if ( clean ) return
        
        window.ipcRenderer.removeAllListeners('all-frames')
    };

    const onResetDataSlice = () => {
        dispatch(resetDataSlice())
    }

    return {
        // ATRIBUTES
        isBackendWorking,   
        images,
        processing,
        quiver,

        // METHODS
        onClearQuiver,
        onGetResultData,
        onKillBackend,
        onReCalculateMask,
        onResetDataSlice,
        onSetActiveImage,
        onSetAnalizing,
        onSetImages,
        onSetQuiverAll,
        onSetQuiverTest,
        onUpdateProcessing,
    }
}


