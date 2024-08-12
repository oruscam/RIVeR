import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SectionState, PixelSize, Point, Processing, Section } from './types';

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
    pixelSize: {size: 0, rw_length: 0},
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
    pixelSize: {size: 0, rw_length: 0},
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

const initialState: SectionState = {
    sections: defaultSections,
    activeSection: 0,
    processing: defaultProcessing
};

const sectionSlice = createSlice({
    name: 'data',
    initialState,
    reducers: {
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

    },
});

export const { 
    setSectionPoints, 
    setSectionRealWorld,
    setActiveSection, 
    addSection, 
    deleteSection, 
    setPixelSize,
    updateSection,
 } = sectionSlice.actions;

export default sectionSlice.reducer;