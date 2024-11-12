/**
 * @file useProjectSlice.ts
 * @description This file contains the custom hook to interact with the project slice.
 */

import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../store/store";
import { clearMessage, setLoading, setMessage } from "../store/ui/uiSlice";
import { setProjectDirectory, setProjectType, setVideoData, setFirstFramePath, setVideoParameters, setProjectDetails } from "../store/project/projectSlice";
import { FieldValues } from "react-hook-form";
import { addSection, setActiveSection, updateSection } from "../store/section/sectionSlice";
import {  MODULE_NUMBER } from "../constants/constants";
import { setImages, setProcessingMask, setQuiver, updateProcessingForm } from "../store/data/dataSlice";
import { onLoadCrossSections, onLoadPixelSize, onLoadProcessingForm, onLoadVideoParameters } from "../helpers/loadProjectHelpers";
import { OperationCanceledError, UserSelectionError } from "../errors/errors";


/**
 * Interface to define the methods and attributes to interact with the project slice, and access to the sections slice.
 * @returns - Object with the methods and attributes to interact with the project slice
 */

export const useProjectSlice = () => {
    const dispatch = useDispatch();
    const { projectDirectory, video, type, firstFramePath, projectDetails } = useSelector((state: RootState) => state.project);
    const { sections } = useSelector((state: RootState) => state.section);

    const filePrefix = import.meta.env.VITE_FILE_PREFIX;

    /**
     * Method to initialize the project with the video file and the type of project.
     * @param video | File
     * @param type | string
     */

    const onGetVideo = async () => {
        const ipcRenderer = window.ipcRenderer;
        try {
            const { result, error } = await ipcRenderer.invoke('get-video');
            
            if( error ){
                console.log(error)
                if ( error.type === 'user-selection-error'){
                    throw new UserSelectionError(error.message);
                }
            }

            return result
        } catch (error) {
            console.log("Error en Get Video")
            console.log(error)
            throw error;
        }
    }

    const onInitProject = async (video: { path: string, name: string, type: string}) => {
        dispatch(setLoading(true));

        const extension = video.name.split('.').pop();
        if ( extension?.toUpperCase() !== 'MP4'){
            dispatch(setMessage('We are transforming the video to mp4 format. Please wait a moment.'))
        }

        const ipcRenderer = window.ipcRenderer;

        try {
            const  { result, error } = await ipcRenderer.invoke('init-project', { path: video.path, name: video.name, type: video.type });

            if ( error ){
                if (error.type === 'user-cancel-operation') {
                    throw new OperationCanceledError(error.message);
                }
            }

            const videoData = {
                name: result.name,
                path: filePrefix + result.path,
                width: result.width,
                height: result.height,
                fps: result.fps,
                creation: result.creation,
                duration: result.duration
            }

            dispatch(setVideoData(videoData));
            dispatch(setProjectDirectory(result.directory));
            dispatch(setProjectType(video.type));
            dispatch(setLoading(false));
            dispatch(clearMessage());
            
        } catch (error) {
            dispatch(setLoading(false));
            console.log(' InitPRojec', error instanceof OperationCanceledError)
            
            throw error;
        }    
    }

    /**
     * Method to set the video parameters.
     * @param data | FieldValues - from useFormHook
     */

    const onSetVideoParameters = async ( data: FieldValues) => {
        dispatch(setLoading(true));
        
        const parameters = {
            step: parseFloat(data.step),
            startTime: parseFloat(data.start),
            endTime: parseFloat(data.end),
            startFrame: Math.floor(parseFloat(data.start) * video.data.fps),
            endFrame: Math.floor(parseFloat(data.end) * video.data.fps),
        }
        const ipcRenderer = window.ipcRenderer;
        
        try {
            const result = await ipcRenderer.invoke('first-frame', {
                start_frame: parameters.startFrame,
                end_frame: parameters.endFrame,
                step: parameters.step,
            })

            dispatch(setFirstFramePath(filePrefix + result.initial_frame))
            dispatch(setVideoParameters(parameters))
            dispatch(setLoading(false));
        } catch (error) {
            console.log(error)
        }
    }

    /**
     * function to load the project files stored in the project directory.
     * @returns - number - The step to go to after loading the project.
     */

    const onLoadProject = async () => {
        dispatch(setLoading(true))
        const ipcRenderer = window.ipcRenderer
        try {
            const result = await ipcRenderer.invoke('load-project')
            console.log(result)
            if(result.success){
                const { settings, projectDirectory, videoMetadata, firstFrame, xsections, mask, piv_results } = result.message
                dispatch(setProjectDirectory(projectDirectory))
                dispatch(setProjectType(settings.footage)) 
                dispatch(setVideoData({
                    width: videoMetadata.width,
                    height: videoMetadata.height,
                    fps: videoMetadata.fps,
                    path: filePrefix + settings.video.filepath,
                    duration: videoMetadata.duration,
                    creation: videoMetadata.creation,
                    name: videoMetadata.name,
                }))

                if( firstFrame !== ''){
                    dispatch(setFirstFramePath(filePrefix + firstFrame))
                }
                dispatch(setLoading(false))

                if( piv_results ){
                    onLoadPixelSize(settings.pixel_size, sections[0], dispatch, updateSection)
                    onLoadVideoParameters(settings.video_range, dispatch, setVideoParameters)

                    // * Load images for carousel.
                    const images = await ipcRenderer.invoke('get-images')
                    dispatch(setImages(images))
                    dispatch(setProcessingMask(filePrefix + mask))

                    // * Load cross sections
                    dispatch(setActiveSection(1))
                    const STEP = onLoadCrossSections(xsections, dispatch, updateSection, addSection, sections, window.ipcRenderer)
    
                    if ( settings.processing ){
                        onLoadProcessingForm(settings.processing, dispatch, updateProcessingForm)
                    }

                    const { x, y, u, v, typevector, u_median, v_median } = piv_results
                    dispatch(setQuiver({
                        x: x,
                        y: y,
                        u: u,
                        v: v,
                        typevector: typevector,
                        u_median: u_median,
                        v_median: v_median
                    }))

                    if ( settings.river_name || settings.site || settings.unit_system || settings.medition_date ){ 
                        dispatch(setProjectDetails({
                            riverName: settings.river_name,
                            site: settings.site,
                            unitSistem: settings.unit_system,
                            meditionDate: settings.medition_date
                        }))
                        

                        return MODULE_NUMBER.REPORT
                     }
                    return STEP
                }
                
                if(settings.xsections){
                    onLoadPixelSize(settings.pixel_size, sections[0], dispatch, updateSection)
                    onLoadVideoParameters(settings.video_range, dispatch, setVideoParameters)
                    

                    // * Load images for carousel.
                    const images = await ipcRenderer.invoke('get-images')
                    dispatch(setImages(images))
                    dispatch(setProcessingMask(filePrefix + mask))

                    // * Load cross sections
                    dispatch(setActiveSection(1))
                    onLoadCrossSections(xsections, dispatch, updateSection, addSection, sections, window.ipcRenderer)


                    if ( settings.processing ){
                        onLoadProcessingForm(settings.processing, dispatch, updateProcessingForm)
                    }
                    
                    return MODULE_NUMBER.PROCESSING

                } else if(settings.pixel_size){
                    onLoadPixelSize(settings.pixel_size, sections[0], dispatch, updateSection)
                    onLoadVideoParameters(settings.video_range, dispatch, setVideoParameters)

                    return MODULE_NUMBER.CROSS_SECTIONS

                } else if(settings.video_range){
                    onLoadVideoParameters(settings.video_range, dispatch, setVideoParameters)

                    return MODULE_NUMBER.PIXEL_SIZE
                } else {
                    return MODULE_NUMBER.VIDEO_RANGE
                } 
            } else {
                dispatch(setLoading(false))
                return result.message
            }
        } catch (error) {
            console.log("Error en Load Project")
            console.log(error)
            dispatch(setLoading(false))
            return "Elige un directorio válido"
        }
    }
    
    /**
     * Handles the click event for the "Finish" button.
     * 
     * @param nextStep - The function to be called after successfully handling the click event.
     */

    interface onClickFinishInterface {
        riverName?: string,
        site?: string,
        unitSistem: string,
        meditionDate: string,
    }

    const onProjectDetailsChange = ( data : onClickFinishInterface) => {
        dispatch(setLoading(true))  
        if ( data.riverName ) {
            dispatch(setProjectDetails({...projectDetails, riverName: data.riverName, meditionDate: data.meditionDate, unitSistem: data.unitSistem}))
        } else if ( data.site ) {
            dispatch(setProjectDetails({...projectDetails, site: data.site, meditionDate: data.meditionDate, unitSistem: data.unitSistem}))
        } else {
            dispatch(setProjectDetails({...projectDetails, meditionDate: data.meditionDate, unitSistem: data.unitSistem}))
        }
        dispatch(setLoading(false))
    }

    const onSaveProjectDetails = async () => {
        const ipcRenderer = window.ipcRenderer;

        await ipcRenderer.invoke('set-project-details', projectDetails)

    }

    return {
        // ATRIBUTES
        firstFramePath,
        projectDetails,
        projectDirectory,
        type,
        video,

        // METHODS
        onInitProject,
        onLoadProject,
        onSetVideoParameters,
        onGetVideo,
        onProjectDetailsChange,
        onSaveProjectDetails
    }
}