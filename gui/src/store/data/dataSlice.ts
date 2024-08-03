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
    name: string;
}

interface PixelSize {
    size: number;
    rw_lenght: number;
}



interface Section {
    name: string;
    drawLine: boolean;
    points: Point[];
    bathimetry: Bathimetry
    pixelSize: PixelSize
    realWorld: Point[];
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
    type: string;
}

interface Processing {
    par: string[];
    maskPath?: string;
    step1: number;
    heightRoi: number;
    grayscale: boolean;
    removeBackground: boolean;
    clahe: boolean;
    clipLimit: number;
    stdFiltering: boolean;
    threshold1: number;
    medianTest: boolean;
    epsilon: number;
    threshold2: number;
    test: boolean;
    artificialSeeding: boolean
}

interface DataState {
    projectDirectory: string;
    video: Video;
    sections: Section[];
    activeSection: number;
    processing: Processing;
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
        step: "1",
        startTime: "0",
        endTime: "1",
        startFrame: "",
        endFrame: "",
    },
    firstFramePath: "",
    type: ""
}

const defaultSections = [{
    name: "pixel_size",
    drawLine: false,
    points: [],
    bathimetry: {
        blob: '',
        level: 0,
        path: '',
        name: ''
    },
    pixelSize: {size: 0, rw_lenght: 0},
    realWorld: [{x: 0, y: 0}, {x: 0, y: 0}]
    },
    {
    name: "CS_default_1",
    drawLine: false,
    points: [],
    bathimetry: {
        blob: '',
        level: 0,
        path: '',
        name: ''
    },
    pixelSize: {size: 0, rw_lenght: 0},
    realWorld: [{x: 0, y: 0}, {x: 0, y: 0}]
    }
]

const defaultProcessing: Processing = {
    par: ['', "1", '', "2"],
    step1: 128,
    heightRoi: 0,
    grayscale: true,
    removeBackground: false,
    clahe: false,
    clipLimit: 0,
    stdFiltering: false,
    threshold1: 0,
    medianTest: false,
    epsilon: 0,
    threshold2: 0,
    test: false,
    artificialSeeding: true
}

const initialState: DataState = {
    projectDirectory: "",
    video: defaultVideo,
    sections: defaultSections,
    activeSection: 0,
    processing: defaultProcessing
};

const dataSlice = createSlice({
    name: 'data',
    initialState,
    reducers: {
        //  TODO: UNIFICAR 
        setProjectDirectory: (state, action: PayloadAction<string>) => {
            state.projectDirectory = action.payload;
        },
        setVideoData: (state, action: PayloadAction<VideoData>) => {
            state.video.data = action.payload;
        },
        setVideoType: (state, action: PayloadAction<string>) => {
            state.video.type = action.payload;
        },
        // ************************

        setVideoParameters: (state, action: PayloadAction<VideoParameters>) => {   
            state.video.parameters = action.payload;
        },
        setFirstFramePath: (state, action: PayloadAction<string>) => {
            state.video.firstFramePath = action.payload;
            state.processing.par[0] = action.payload;
        },
        
        // ** Interaction with PixelSize.
        setPixelSize: (state, action: PayloadAction<PixelSize>) => {
            state.sections[state.activeSection].pixelSize = action.payload;
        }, 

        // ** Interaction with sections points.

        setSectionPoints: (state, action: PayloadAction<Point[]>) => {
            state.sections[state.activeSection].points = action.payload;
        },

        setSectionRealWorld: (state, action: PayloadAction<Point[]>) => {
            state.sections[state.activeSection].realWorld = action.payload;
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

        updateSection: (state, action: PayloadAction<Section>) => {
            state.sections[state.activeSection] = action.payload
        },

        updateProcessing: (state, action: PayloadAction<Processing>) => {
            state.processing = action.payload
        }
    },
});

export const { 
    setProjectDirectory, 
    setVideoParameters, 
    setVideoData, 
    setSectionPoints, 
    setSectionRealWorld,
    setActiveSection, 
    addSection, 
    deleteSection, 
    setPixelSize,
    setFirstFramePath,
    setVideoType,
    updateSection,
    updateProcessing
 } = dataSlice.actions;

export default dataSlice.reducer;