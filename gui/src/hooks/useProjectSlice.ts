/**
 * @file useProjectSlice.ts
 * @description This file contains the custom hook to interact with the project slice.
 */

import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../store/store";
import { setLoading } from "../store/ui/uiSlice";
import { setProjectDirectory, setProjectType, setVideoData, setFirstFramePath, setVideoParameters, setProjectDetails } from "../store/project/projectSlice";
import { FieldValues } from "react-hook-form";
import { addSection, setActiveSection, updateSection } from "../store/section/sectionSlice";
import { STEP_3, STEP_4, STEP_5, STEP_6 } from "../constants/constants";
import { setImages } from "../store/data/dataSlice";
import { onLoadCrossSections, onLoadPixelSize, onLoadVideoParameters } from "../helpers/loadProjectHelpers";
import { OperationCanceledError, UserSelectionError } from "../errors/errors";


/**
 * Interface to define the methods and attributes to interact with the project slice, and access to the sections slice.
 * @returns - Object with the methods and attributes to interact with the project slice
 */

export const useProjectSlice = () => {
    const dispatch = useDispatch();
    const { projectDirectory, video, type, firstFramePath, projectDetails } = useSelector((state: RootState) => state.project);
    const { sections } = useSelector((state: RootState) => state.section);

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

            console.log(result)

            return result
        } catch (error) {
            console.log("Error en Get Video")
            console.log(error)
            throw error;
        }
    }


    const onInitProject = async (video: { path: string, name: string, type: string}) => {
        dispatch(setLoading(true));
        console.log("onInitProject")
        console.log(video)
        const ipcRenderer = window.ipcRenderer;
        
        try {
            const  { result, error } = await ipcRenderer.invoke('init-project', { path: video.path, name: video.name, type: video.type });
            
            if ( error ){
                if (error.type === 'user-cancel-operation') {
                    throw new OperationCanceledError(error.message);
                }
            }

            const videoData = {
                name: video.name,
                path: video.path,
                width: result.width,
                height: result.height,
                fps: result.fps,
                creation: result.creation,
                // blob: blob,
                duration: result.duration
            }

            dispatch(setVideoData(videoData));
            dispatch(setProjectDirectory(result.directory));
            dispatch(setProjectType(type));

            dispatch(setLoading(false));
            
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
            startFrame: Math.floor(parseFloat(data.start) * video.data.fps).toString(),
            endFrame: Math.floor(parseFloat(data.end) * video.data.fps).toString(),
        }
        const ipcRenderer = window.ipcRenderer;
        
        try {
            const result = await ipcRenderer.invoke('first-frame', {
                start_frame: parameters.startFrame,
                end_frame: parameters.endFrame,
                step: parameters.step,
            })

            dispatch(setFirstFramePath(result.initial_frame))
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
                const { data, projectDirectory, videoMetadata, firstFrame, xsections } = result.message
                console.log(data)
                dispatch(setProjectDirectory(projectDirectory))
                dispatch(setProjectType(data.type)) 
                dispatch(setVideoData({
                    width: videoMetadata.width,
                    height: videoMetadata.height,
                    fps: videoMetadata.fps,
                    path: data.filepath,
                    duration: videoMetadata.duration,
                    creation: videoMetadata.creation,
                    name: null,
                    blob: null
                }))
                if( firstFrame !== ''){
                    dispatch(setFirstFramePath(firstFrame))
                }
                dispatch(setLoading(false))
            
                if(data.xsections){
                    onLoadPixelSize(data.pixel_size, sections[0], dispatch, updateSection)
                    onLoadVideoParameters(data.video_range, dispatch, setVideoParameters)
                    

                    // * Load images for carousel.
                    const images = await ipcRenderer.invoke('get-images')
                    dispatch(setImages(images))

                    // * Load cross sections
                    dispatch(setActiveSection(1))
                    onLoadCrossSections(xsections, dispatch, updateSection, addSection, sections)

                    return STEP_6

                } else if(data.pixel_size){
                    onLoadPixelSize(data.pixel_size, sections[0], dispatch, updateSection)
                    onLoadVideoParameters(data.video_range, dispatch, setVideoParameters)

                    return STEP_5

                } else if(data.video_range){
                    onLoadVideoParameters(data.video_range, dispatch, setVideoParameters)

                    return STEP_4
                } else {
                    return STEP_3
                } 
            } else {
                console.log(result.message)
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
        riverName: string,
        site: string,
        unitSistem: string,
        meditionDate: string,
    }

    const onClickFinish = ( data : onClickFinishInterface) => {
        dispatch(setLoading(true))  
        dispatch(setProjectDetails(data))
        dispatch(setLoading(false))

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
        onClickFinish
    }
}