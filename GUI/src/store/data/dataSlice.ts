import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Point {
    x: number;
    y: number;
}

interface BathFile {
    blob: string | Blob;
    path: string
}

interface Bathimetry {
    blob: string | Blob;
    level: number;
    path: string;
}

interface PixelSize {
    size: number;
    rw_lenght: number;
}

interface RealWord {
    eastLeft: number,
    northLeft: number,
    eastRight: number,
    northRight: number
}



interface HardMode {
    realWord: RealWord;
}


interface Section {
    name: string;
    drawLine: boolean;
    points: Point[];
    bathimetry: Bathimetry
    pixelSize: PixelSize | boolean;
    hardMode: HardMode | boolean;
}


interface VideoData {
    name: string | null;
    path: string;
    width: number;
    height: number;
    fps: number;
    blob: string | null;
    duration: number;
}

interface VideoParameters {
    step: string;
    startTime: string | null;
    endTime: string | null;
    startFrame: string;
    endFrame: string;
}

interface Video {
    data: VideoData;
    parameters: VideoParameters;
    firstFramePath: string

}

interface DataState {
    projectDirectory: string;
    points: Point[];
    video: Video;
    sections: Section[];
    activeSection: number;
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
        step: "",
        startTime: "",
        endTime: "",
        startFrame: "",
        endFrame: "",
    },
    firstFramePath: ""
}

const defaultSections = [{
    name: "pixel_size",
    drawLine: false,
    points: [],
    bathimetry: {
        blob: '',
        level: 0,
        path: ''
    },
    pixelSize: false,
    hardMode: false
    },
    {
    name: "CS_default_1",
    drawLine: false,
    points: [],
    bathimetry: {
        blob: '',
        level: 0,
        path: ''
    },
    pixelSize: false,
    hardMode: false
    }
]

const initialState: DataState = {
    projectDirectory: "",
    points: [],
    video: defaultVideo,
    sections: defaultSections,
    activeSection: 0
};

const dataSlice = createSlice({
    name: 'data',
    initialState,
    reducers: {
        setProjectDirectory: (state, action: PayloadAction<string>) => {
            state.projectDirectory = action.payload;
        },
        setVideoData: (state, action: PayloadAction<VideoData>) => {
            state.video.data = action.payload;
        },
        setVideoParameters: (state, action: PayloadAction<VideoParameters>) => {   
            state.video.parameters = action.payload;
        },
        setFirstFramePath: (state, action: PayloadAction<string>) => {
            state.video.firstFramePath = action.payload;
        },
        
        // ** Interaction with PixelSize.
        setPixelSize: (state, action: PayloadAction<PixelSize>) => {
            state.sections[0].pixelSize = action.payload;
        }, 

        // ** Interaction with sections.

        setSectionsPoints: (state, action: PayloadAction<Point[]>) => {
            state.sections[state.activeSection].points = action.payload;
        },
        setDrawLine: (state) => {
            state.sections[state.activeSection].drawLine = !state.sections[state.activeSection].drawLine;
        },
        addSection: (state, action: PayloadAction<Section>) => {
            state.sections.push(action.payload);
            state.activeSection = state.sections.length - 1;
        },
        deleteSection: (state) => {
            const newActive = state.activeSection - 1;
            state.sections.splice(state.activeSection, 1);
            state.activeSection = newActive
        },
        setActiveSection: (state, action: PayloadAction<number>) => {
            state.activeSection = action.payload;
        },
        changeNameSection: (state, action: PayloadAction<string>) => {
            state.sections[state.activeSection].name = action.payload
        },

        setBathimetryFile: ( state, action: PayloadAction<BathFile>) => {
            state.sections[state.activeSection].bathimetry.blob = action.payload.blob;
            state.sections[state.activeSection].bathimetry.path = action.payload.path
        },
        
        setBathimetryLevel: ( state, action: PayloadAction<number>) => {
            state.sections[state.activeSection].bathimetry.level = action.payload;
        }

        // *******************************


        // setVideoParameters: (state, action: PayloadAction<VideoParameters>) => {
        //     state.video.parameters = action.payload;
        // }
    },
});

export const { 
    setProjectDirectory, 
    setVideoParameters, 
    setVideoData, 
    setSectionsPoints, 
    setDrawLine, 
    setActiveSection, 
    addSection, 
    deleteSection, 
    changeNameSection, 
    setPixelSize,
    setBathimetryFile,
    setBathimetryLevel,
    setFirstFramePath
 } = dataSlice.actions;

export default dataSlice.reducer;