/**
 * @file useProjectSlice.ts
 * @description This file contains the custom hook to interact with the project slice.
 */

import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../store/store";
import { setLoading } from "../store/ui/uiSlice";
import { setProjectDirectory, setProjectType, setVideoData, setFirstFramePath, setVideoParameters } from "../store/project/projectSlice";
import { FieldValues } from "react-hook-form";
import { addSection, setActiveSection, updateSection } from "../store/section/sectionSlice";
import { STEP_3, STEP_4, STEP_5, STEP_6 } from "../constants/constants";
import { setImages } from "../store/data/dataSlice";
import { onLoadCrossSections, onLoadPixelSize, onLoadVideoParameters } from "../helpers/loadProjectHelpers";


/**
 * Interface to define the methods and attributes to interact with the project slice, and access to the sections slice.
 * @returns - Object with the methods and attributes to interact with the project slice
 */

export const useProjectSlice = () => {
    const dispatch = useDispatch();
    const { projectDirectory, video, type, firstFramePath } = useSelector((state: RootState) => state.project);
    const { sections } = useSelector((state: RootState) => state.section);

    /**
     * Method to initialize the project with the video file and the type of project.
     * @param video | File
     * @param type | string
     */

    const onInitProject = async (video: File, type: string) => {
        dispatch(setLoading(true));
        const blob = URL.createObjectURL(video);
        const ipcRenderer = window.ipcRenderer;
       
        try {
            const result = await ipcRenderer.invoke('init-project', { path: video.path, name: video.name, type: type });
            const videoData = {
                name: video.name,
                path: video.path,
                width: result.width,
                height: result.height,
                fps: result.fps,
                blob: blob,
                duration: result.duration
            }

            dispatch(setVideoData(videoData));
            dispatch(setProjectDirectory(result.directory));
            dispatch(setProjectType(type));

            dispatch(setLoading(false));
        } catch (error) {
            console.log("Error occurred while initializing project:", error);
            dispatch(setLoading(false));
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
            step: data.step,
            startTime: data.start,
            endTime: data.end,
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
            dispatch(setLoading(false))
            return "Elige un directorio válido"
        }
    }
    
    return {
        // ATRIBUTES
        firstFramePath,
        projectDirectory,
        type,
        video,


        // METHODS
        onInitProject,
        onLoadProject,
        onSetVideoParameters
    }
}