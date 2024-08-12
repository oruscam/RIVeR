import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ProjectState, VideoData, VideoParameters } from "./types";

const defaultVideo = {
    data : {
        name: "",
        path: "",
        width: 0,
        height: 0,
        fps: 0,
        blob: "",
        duration: 0
    },
    parameters: {
        step: "1",
        startTime: "0",
        endTime: "1",
        startFrame: "",
        endFrame: "",
    },
}

const initialState: ProjectState = {
    projectDirectory: '',
    video: defaultVideo,
    type: '',
    firstFramePath: '',
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
    }
});

export const {
    setProjectDirectory,
    setVideoData,
    setProjectType,
    setVideoParameters,
    setFirstFramePath
} = projectSlice.actions;

export default projectSlice.reducer;