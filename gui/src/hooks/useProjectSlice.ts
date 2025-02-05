/**
 * @file useProjectSlice.ts
 * @description This file contains the custom hook to interact with the project slice.
 */

import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../store/store";
import { clearErrorMessage, clearMessage, setLoading, setMessage } from "../store/ui/uiSlice";
import { setProjectDirectory, setProjectType, setVideoData, setFirstFramePath, setVideoParameters, setProjectDetails } from "../store/project/projectSlice";
import { FieldValues } from "react-hook-form";
import { addSection, setActiveSection, setSummary, setTransformationMatrix, updateSection } from "../store/section/sectionSlice";
import {  MODULE_NUMBER } from "../constants/constants";
import { setDataLoaded, setImages, setProcessingMask, setQuiver, updateProcessingForm } from "../store/data/dataSlice";
import { onLoadObliquePoints, onLoadCrossSections, onLoadPixelSize, onLoadProcessingForm, onLoadVideoParameters } from "../helpers/index";
import { OperationCanceledError, UserSelectionError } from "../errors/errors";
import { parseTime } from "../helpers";
import { setIpcamCameraSolution, setIpcamPoints, setObliquePoints } from "../store/matrix/matrixSlice";
import { path } from "d3";
import { onLoadCameraSolution } from "../helpers/loadProjectHelpers";


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
                console.log(error)
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
            dispatch(clearMessage());
            console.log(error)
            throw error;
        }    
    }

    /**
     * Method to set the video parameters.
     * @param data | FieldValues - from useFormHook
     */

    const onSetVideoParameters = async ( data: FieldValues) => {
        dispatch(setLoading(true));
        dispatch(setMessage('We are extracting the frames, wait a moment'))

        const { startTime, endTime, step } = video.parameters;

        const parsedStart = parseTime(data.start);
        const parsedEnd = parseTime(data.end);

        if( parsedStart === startTime && parsedEnd === endTime && parseFloat(data.step) === step){
            dispatch(setLoading(false));
            dispatch(clearMessage());
            return
        }
        
        const parameters = {
            step: parseFloat(data.step),
            startTime: parsedStart,
            endTime: parsedEnd,
            startFrame: Math.floor(parsedStart* video.data.fps),
            endFrame: Math.floor(parsedEnd * video.data.fps),
        }
        const ipcRenderer = window.ipcRenderer;
        
        try {
            const result = await ipcRenderer.invoke('first-frame', {
                start_frame: parameters.startFrame,
                end_frame: parameters.endFrame,
                step: parameters.step,
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
                const { settings, projectDirectory, videoMetadata, firstFrame, xsections, mask, piv_results, paths, matrix, rectification3D } = result.message
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
                dispatch(clearErrorMessage())

                if ( paths.length !== 0){
                    dispatch(setImages({ paths: paths }))
                }

                if ( matrix !== undefined ){
                    dispatch(setTransformationMatrix(matrix))
                }

                if( firstFrame !== ''){
                    dispatch(setFirstFramePath(filePrefix + firstFrame))
                }
                dispatch(setLoading(false))

                console.log('rectification', rectification3D)
                console.log('settings pixel size', settings.pixel_size)                

                if( piv_results ){
                    
                    if ( settings.pixel_size ){
                        onLoadPixelSize(settings.pixel_size, sections[0], dispatch, updateSection)
                    }

                    if ( settings.control_points ){
                        onLoadObliquePoints(settings.control_points, dispatch, setObliquePoints)
                    }

                    if ( settings.grp_3d ){
                        dispatch(setIpcamPoints({
                            points: rectification3D.points,
                            path: undefined
                        }))
                        if ( settings.camera_solution_3d ){
                            onLoadCameraSolution(rectification3D.cameraSolution, dispatch, setIpcamCameraSolution)
                        }
                    }

                    onLoadVideoParameters(settings.video_range, dispatch, setVideoParameters, videoMetadata.fps)

                    // * Load images for carousel.
                    dispatch(setProcessingMask(filePrefix + mask))

                    // * Load cross sections
                    dispatch(setActiveSection(1))
                    const STEP = onLoadCrossSections(xsections, dispatch, updateSection, addSection, sections, window.ipcRenderer, setSummary)
    
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
                    
                    if ( STEP === MODULE_NUMBER.RESULTS){
                        dispatch(setDataLoaded(true))
                    }

                    return STEP
                }
                
                if(settings.xsections){

                    if ( settings.pixel_size ){
                        onLoadPixelSize(settings.pixel_size, sections[0], dispatch, updateSection)
                    }

                    if ( settings.control_points ){
                        onLoadObliquePoints(settings.control_points, dispatch, setObliquePoints)
                    }
                    
                    if ( settings.grp_3d ){
                        dispatch(setIpcamPoints({
                            points: rectification3D.points,
                            path: undefined
                        }))
                        if ( settings.camera_solution_3d ){
                            onLoadCameraSolution(rectification3D.cameraSolution, dispatch, setIpcamCameraSolution)
                        }
                    }

                    onLoadVideoParameters(settings.video_range, dispatch, setVideoParameters, videoMetadata.fps)
                    
                    // * Load images for carousel.
                    dispatch(setProcessingMask(filePrefix + mask))

                    // * Load cross sections
                    dispatch(setActiveSection(1))
                    onLoadCrossSections(xsections, dispatch, updateSection, addSection, sections, window.ipcRenderer)

                    if ( settings.processing ){
                        onLoadProcessingForm(settings.processing, dispatch, updateProcessingForm)
                    }
                    
                    return MODULE_NUMBER.PROCESSING

                } else if(settings.pixel_size ){
                    onLoadPixelSize(settings.pixel_size, sections[0], dispatch, updateSection)
                    onLoadVideoParameters(settings.video_range, dispatch, setVideoParameters, videoMetadata.fps)

                    return MODULE_NUMBER.CROSS_SECTIONS

                } else if (settings.control_points){
                    onLoadObliquePoints(settings.control_points, dispatch, setObliquePoints)
                    onLoadVideoParameters(settings.video_range, dispatch, setVideoParameters, videoMetadata.fps)

                    return MODULE_NUMBER.CROSS_SECTIONS
                } else if (settings.grp_3d){
                    dispatch(setIpcamPoints({
                        points: rectification3D.points,
                        path: undefined
                    }))
                    if ( settings.camera_solution_3d ){
                        onLoadCameraSolution(rectification3D.cameraSolution, dispatch, setIpcamCameraSolution)
                    }
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