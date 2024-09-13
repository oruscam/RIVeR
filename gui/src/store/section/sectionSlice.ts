import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SectionState, PixelSize, Point, Section, SectionData } from './types';

const defaultSections = [{
        name: "pixel_size",
        drawLine: false,
        points: [],
        bathimetry: {
            level: 0,
            path: '',
            name: '',
        },
        pixelSize: {size: 0, rw_length: 0},
        realWorld: [{x: 0, y: 0}, {x: 0, y: 0}],
        extraFields: false
    },
    {
        name: "CS_default_1",
        drawLine: false,
        points: [],
        bathimetry: {
            level: 0,
            path: '/@fs/home/tomy_ste/Desktop/XS1_DistElev.csv',
            // path: '',
            name: '',
        },
        pixelSize: {size: 0, rw_length: 0},
        realWorld: [{x: 0, y: 0}, {x: 0, y: 0}],
        extraFields: false,
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
        
        setSectionData: (state, action: PayloadAction<{sectionIndex: number, sectionData: SectionData}>) => {
            state.sections[action.payload.sectionIndex].data = action.payload.sectionData;
        },
        changeSectionData : (state, action: PayloadAction<SectionData>) => {
            state.sections[state.activeSection].data = action.payload;
        },
        setBathimetry: (state, action: PayloadAction<{path: string, name: string, data: Point[]}>) => {
            state.sections[state.activeSection].bathimetry.path = action.payload.path;
            state.sections[state.activeSection].bathimetry.name = action.payload.name;
            state.sections[state.activeSection].bathimetry.line = action.payload.data;
        }
        ,

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
    setSectionData,
    changeSectionData,
    setBathimetry
 } = sectionSlice.actions;

export default sectionSlice.reducer;