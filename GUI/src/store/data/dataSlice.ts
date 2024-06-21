import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Point {
    x: number;
    y: number;
}

interface VideoData {
    name: string;
    path: string;
    width: number;
    height: number;
    fps: number;
    blob: string;
    duration: number;
}

interface VideoParameters {
    step: string;
    startTime: string;
    endTime: string;
    startFrame: string;
    endFrame: string;
    firstFramePath: string
}


interface Video {
    data: VideoData;
    parameters: VideoParameters;
  }


interface DataState {
    points: Point[];
    video: Video;
}

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
        step: 0,
        startTime: 0,
        endTime: 0,
        startFrame: "",
        endFrame: "",
        firstFramePath: ""
    }
}

const initialState: DataState = {
    points: [],
    video: defaultVideo
};

const dataSlice = createSlice({
    name: 'data',
    initialState,
    reducers: {
        setVideoData: (state, action: PayloadAction<VideoData>) => {
            state.video.data = action.payload;
        },
        setVideoParameters: (state, action: PayloadAction<VideoParameters>) => {   
            state.video.parameters = action.payload;
        },



        setPoints: (state, action: PayloadAction<Point[]>) => {
            state.points = action.payload;
        },
        clearPoints: (state) => {
            state.points = [];
        },




        // setVideoParameters: (state, action: PayloadAction<VideoParameters>) => {
        //     state.video.parameters = action.payload;
        // }
    },
});

export const { setPoints, clearPoints, setVideoParameters, setVideoData } = dataSlice.actions;
export default dataSlice.reducer;