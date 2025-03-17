import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ProjectDetails, ProjectState, VideoData, VideoParameters } from "./types";

const defaultVideo = {
    data : {
        name: "",
        path: "",
        width: 0,
        height: 0,
        fps: 0,
        duration: 0,
        creation: "",
    },
    parameters: {
        step: 1,
        startTime: 0,
        endTime: 0,
        startFrame: 0,
        endFrame: 0,
        factor: 1
    },
}

const initialState: ProjectState = {
    projectDirectory: '',
    video: defaultVideo,
    type: '',
    firstFramePath: '',
    projectDetails: {
        riverName: '',
        site: '',
        unitSistem: 'si',
        meditionDate: '',
    }
}

const projectSlice = createSlice({
    name: 'project',
    initialState,
    reducers: {
        setProjectDirectory: (state, action: PayloadAction<string>) => {
            state.projectDirectory = action.payload;
        },
        setVideoData: (state, action: PayloadAction<VideoData>) => {
            state.video.data = action.payload;
        },
        setProjectType: (state, action: PayloadAction<string>) => {
            state.type = action.payload
        },
        setVideoParameters: (state, action: PayloadAction<VideoParameters>) => {   
            state.video.parameters = action.payload;
        },
        setFirstFramePath: (state, action: PayloadAction<string>) => {
            state.firstFramePath = action.payload;
        },
        setProjectDetails: (state, action: PayloadAction<ProjectDetails>) => {
            state.projectDetails = action.payload;
        },
        resetProjectSlice: ( state ) => {
            state.projectDirectory = '';
            state.video = defaultVideo;
            state.type = '';
            state.firstFramePath = '';
            state.projectDetails = {
                riverName: '',
                site: '',
                unitSistem: 'si',
                meditionDate: '',
            }
        }  
    }
});

export const {
    setFirstFramePath,
    setProjectDetails,
    setProjectDirectory,
    setProjectType,
    setVideoData,
    setVideoParameters,
    resetProjectSlice
} = projectSlice.actions;

export default projectSlice.reducer;