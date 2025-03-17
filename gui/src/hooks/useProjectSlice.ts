/**
 * @file useProjectSlice.ts
 * @description This file contains the custom hook to interact with the project slice.
 */

import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../store/store";
import { clearErrorMessage, clearMessage, setLanguage, setLoading, setMessage } from "../store/ui/uiSlice";
import { setProjectDirectory, setProjectType, setVideoData, setFirstFramePath, setVideoParameters, setProjectDetails, resetProjectSlice } from "../store/project/projectSlice";
import { FieldValues } from "react-hook-form";
import { addSection, setSummary, setTransformationMatrix, updateSection } from "../store/section/sectionSlice";
import {  MODULE_NUMBER } from "../constants/constants";
import { setDataLoaded, setImages, setProcessingMask, setQuiver, updateProcessingForm } from "../store/data/dataSlice";
import { onLoadObliquePoints, onLoadCrossSections, onLoadPixelSize, onLoadProcessingForm, onLoadVideoParameters } from "../helpers/index";
import { OperationCanceledError, UserSelectionError } from "../errors/errors";
import { parseTime } from "../helpers";
import { setIpcamCameraSolution, setIpcamImages, setIpcamPoints, setObliquePoints, updatePixelSize } from "../store/matrix/matrixSlice";
import { onLoad3dRectification } from "../helpers/loadProjectHelpers";
import { useTranslation } from "react-i18next";


/**
 * Interface to define the methods and attributes to interact with the project slice, and access to the sections slice.
 * @returns - Object with the methods and attributes to interact with the project slice
 */

export const useProjectSlice = () => {
    const dispatch = useDispatch();
    const { projectDirectory, video, type, firstFramePath, projectDetails } = useSelector((state: RootState) => state.project);
    const { sections } = useSelector((state: RootState) => state.section);
    const { pixelSize } = useSelector((state: RootState) => state.matrix);
    const { t } = useTranslation()

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

    const onInitProject = async (videoInput: { path: string, name: string, type: string}, language: string) => {
        dispatch(setLoading(true));

        const extension = videoInput.name.split('.').pop();
        if ( extension?.toUpperCase() !== 'MP4'){
            dispatch(setMessage(t('Loader.videoConversion')))
        }

        const ipcRenderer = window.ipcRenderer;

        try {
            const  { result, error } = await ipcRenderer.invoke('init-project', { path: videoInput.path, name: videoInput.name, type: videoInput.type, language: language });

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

            // Determine the best factor for the frames extraction.
            // By default, if the video is 2688x1520 or less, the factor is 1. Orginal resolution.
            // When the resolution is higher than 2688x1520 and less than 3840x2160, the factor is 0.5.
            // If the resolution is higher than 3840x2160, the factor is 0.25

            if (result.width <= 2688 && result.height <= 1520) {
                dispatch(setVideoParameters({ ...video.parameters, factor: 1 }));
            } else if (result.width <= 3840 && result.height <= 2160) {
                dispatch(setVideoParameters({ ...video.parameters, factor: 0.5 }));
            } else {
                dispatch(setVideoParameters({ ...video.parameters, factor: 0.25 }));
            }

            dispatch(setVideoData(videoData));
            dispatch(setProjectDirectory(result.directory));
            dispatch(setProjectType(videoInput.type));
            dispatch(setLoading(false));
            dispatch(clearMessage());
            
        } catch (error) {
            dispatch(setLoading(false));
            dispatch(clearMessage());
            console.log(error)
            throw error;
        }    
    }

    const onChangeFramesResolution = async ( factor: number ) => {
        dispatch(setVideoParameters({ ...video.parameters, factor: factor }));
    }


    /**
     * Method to set the video parameters.
     * @param data | FieldValues - from useFormHook
     */

    const onSetVideoParameters = async ( data: FieldValues ) => {
        dispatch(setLoading(true));
        dispatch(setMessage(t('Loader.extractingFrames')))

        const { startTime, endTime, step, factor } = video.parameters;

        const parsedStart = parseTime(data.start);
        const parsedEnd = parseTime(data.end);

        if( parsedStart === startTime && parsedEnd === endTime && parseFloat(data.step) === step ){
            dispatch(setLoading(false));
            dispatch(clearMessage());
            return false;
        }

        dispatch(setImages({paths: []}))
        const parameters = {
            step: parseFloat(data.step),
            startTime: parsedStart,
            endTime: parsedEnd,
            startFrame: Math.floor(parsedStart* video.data.fps),
            endFrame: Math.floor(parsedEnd * video.data.fps),
            factor: factor
        }
        const ipcRenderer = window.ipcRenderer;
        
        try {
            const result = await ipcRenderer.invoke('first-frame', {
                start_frame: parameters.startFrame,
                end_frame: parameters.endFrame,
                step: parameters.step,
                factor: factor
            })

            dispatch(clearMessage())
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
            if(result.success){
                const { settings, projectDirectory, videoMetadata, firstFrame, xsections, mask, piv_results, paths, matrix, rectification3D, bbox, orthoImage } = result.message
                dispatch(setProjectDirectory(projectDirectory))
                dispatch(setProjectType(settings.footage)) 

                // Set the language
                dispatch(setLanguage(settings.language))

                dispatch(setVideoData({
                    width: videoMetadata.width,
                    height: videoMetadata.height,
                    fps: videoMetadata.fps,
                    path: filePrefix + settings.video.filepath,
                    duration: videoMetadata.duration,
                    creation: videoMetadata.creation,
                    name: videoMetadata.name,
                }))
                dispatch(clearErrorMessage())

                if ( paths){
                    if ( paths.length !== 0) {
                        dispatch(setImages({ paths: paths }))
                    }
                }

                if ( matrix !== undefined ){
                    dispatch(setTransformationMatrix({ transformationMatrix: matrix }))                  
                }

                if( firstFrame !== ''){
                    dispatch(setFirstFramePath(filePrefix + firstFrame))
                }
                dispatch(setLoading(false))

                if( piv_results ){
                    
                    if ( settings.pixel_size ){
                        onLoadPixelSize(settings.pixel_size, pixelSize, dispatch, updatePixelSize, orthoImage, settings.transformation, matrix)
                    }

                    if ( settings.control_points ){
                        onLoadObliquePoints(settings.control_points, dispatch, setObliquePoints, orthoImage, settings.transformation, matrix)
                    }
                    
                    if ( settings.grp_3d ){
                        onLoad3dRectification(rectification3D, dispatch, setIpcamPoints, setIpcamCameraSolution, setIpcamImages)
                    }

                    onLoadVideoParameters(settings.video_range, dispatch, setVideoParameters, videoMetadata.fps)

                    // * Load images for carousel.
                    dispatch(setProcessingMask({ mask: filePrefix + mask, bbox: bbox }))

                    // * Load cross sections
                    const STEP = onLoadCrossSections(xsections, dispatch, updateSection, addSection, sections, window.ipcRenderer, setSummary)
    
                    if ( settings.processing ){
                        onLoadProcessingForm(settings.processing, dispatch, updateProcessingForm)
                    }

                    const { x, y, u, v, typevector, u_median, v_median } = piv_results
                    dispatch(setQuiver({
                        quiver: {
                            x: x,
                            y: y,
                            u: u,
                            v: v,
                            typevector: typevector,
                            u_median: u_median,
                            v_median: v_median,
                            test: false
                        },
                        test: false
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
                    
                    if ( STEP === MODULE_NUMBER.RESULTS){
                        dispatch(setDataLoaded(true))
                    }

                    return STEP
                }
                
                if( settings.xsections ){

                    if ( settings.pixel_size ){
                        onLoadPixelSize(settings.pixel_size, pixelSize, dispatch, updatePixelSize, orthoImage, settings.transformation, matrix)
                    }

                    if ( settings.control_points ){
                        onLoadObliquePoints(settings.control_points, dispatch, setObliquePoints, orthoImage, settings.transformation, matrix)

                    }
                    
                    if ( settings.grp_3d ){
                        onLoad3dRectification(rectification3D, dispatch, setIpcamPoints, setIpcamCameraSolution,  setIpcamImages)
                    }

                    onLoadVideoParameters(settings.video_range, dispatch, setVideoParameters, videoMetadata.fps)
                    
                    // * Load images for carousel.
                    dispatch(setProcessingMask({ mask: filePrefix + mask, bbox: bbox }))

                    // * Load cross sections
                    onLoadCrossSections(xsections, dispatch, updateSection, addSection, sections, window.ipcRenderer)

                    if ( settings.processing ){
                        onLoadProcessingForm(settings.processing, dispatch, updateProcessingForm)
                    }
                    
                    return MODULE_NUMBER.PROCESSING

                } else if(settings.pixel_size ){
                    onLoadPixelSize(settings.pixel_size, pixelSize, dispatch, updatePixelSize, orthoImage, settings.transformation, matrix)
                    onLoadVideoParameters(settings.video_range, dispatch, setVideoParameters, videoMetadata.fps)

                    return MODULE_NUMBER.CROSS_SECTIONS

                } else if (settings.control_points){
                    onLoadObliquePoints(settings.control_points, dispatch, setObliquePoints, orthoImage, settings.transformation, matrix)
                    onLoadVideoParameters(settings.video_range, dispatch, setVideoParameters, videoMetadata.fps)

                    return MODULE_NUMBER.CROSS_SECTIONS
                } else if (settings.grp_3d){
                    onLoad3dRectification(rectification3D, dispatch, setIpcamPoints, setIpcamCameraSolution, setIpcamImages)
                    return MODULE_NUMBER.CROSS_SECTIONS
                }
                
                else if(settings.video_range){
                    onLoadVideoParameters(settings.video_range, dispatch, setVideoParameters, videoMetadata.fps)

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
            return "Please choose a valid directory"
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

    const onResetProjectSlice = () => {
        dispatch(resetProjectSlice())
    }

    return {
        // ATRIBUTES
        firstFramePath,
        projectDetails,
        projectDirectory,
        type,
        video,

        // METHODS
        onChangeFramesResolution,
        onGetVideo,
        onInitProject,
        onLoadProject,
        onProjectDetailsChange,
        onResetProjectSlice,
        onSaveProjectDetails,
        onSetVideoParameters,
    }
}