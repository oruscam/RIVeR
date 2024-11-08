import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SectionState, PixelSize, Section, SectionData, Bathimetry } from './types';
import { DEFAULT_ALPHA, DEFAULT_NUM_STATIONS, DEFAULT_POINTS} from '../../constants/constants';
import { Point } from '../../types';

const defaultSections = [{
        name: "pixel_size",
        drawLine: false,
        sectionPoints: DEFAULT_POINTS,
        dirPoints: DEFAULT_POINTS,
        bathimetry: {
            path: '',
            name: '',
        },
        pixelSize: {size: 0, rw_length: 0},
        rwPoints: DEFAULT_POINTS,
        extraFields: false,
        numStations: 0,
        alpha: DEFAULT_ALPHA,
        interpolated: true,
    },
    {
        name: "CS_default_1",
        drawLine: false,
        sectionPoints: DEFAULT_POINTS,
        dirPoints: DEFAULT_POINTS,
        bathimetry: {
            path: '',
            name: '',
        },
        pixelSize: { size: 0, rw_length: 0 },
        rwPoints: DEFAULT_POINTS,
        extraFields: false,
        numStations: DEFAULT_NUM_STATIONS,
        alpha: DEFAULT_ALPHA,
        interpolated: true, 
    }
]

const initialState: SectionState = {
    sections: defaultSections,
    activeSection: 0,
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
        setDirPoints: (state, action: PayloadAction<Point[]>) => {
            state.sections[state.activeSection].dirPoints = action.payload;
        },

        setRealWorldPoints: (state, action: PayloadAction<Point[]>) => {
            state.sections[state.activeSection].rwPoints = action.payload;
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
        
        setSectionData: (state, action: PayloadAction<{sectionIndex: number, sectionData: SectionData}>) => {
            state.sections[action.payload.sectionIndex].data = action.payload.sectionData;
        },
        changeSectionData : (state, action: PayloadAction<SectionData>) => {
            state.sections[state.activeSection].data = action.payload;
        },
        setBathimetry: (state, action: PayloadAction<Bathimetry>) => {
            state.sections[state.activeSection].bathimetry = action.payload;
        },
        setSectionPoints: (state, action: PayloadAction<Point[]>) => {
            state.sections[state.activeSection].sectionPoints = action.payload;
        },
    },
});

export const { 
    addSection, 
    changeSectionData,
    deleteSection, 
    setActiveSection, 
    setBathimetry,
    setDirPoints, 
    setPixelSize,
    setRealWorldPoints,
    setSectionData,
    setSectionPoints,
    updateSection,
} = sectionSlice.actions;

export default sectionSlice.reducer;