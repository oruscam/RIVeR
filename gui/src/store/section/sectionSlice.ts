import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SectionState, PixelSize, Section, SectionData, Bathimetry, Summary } from './types';
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
        hasChanged: false
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
        hasChanged: false
    }
]

const initialState: SectionState = {
    sections: defaultSections,
    summary: undefined,
    activeSection: 0,
    sectionsCounter: 2,
    transformationMatrix: []
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
        deleteSection: (state, action: PayloadAction<number>) => {
            if ( action.payload === -1 ){
                const newActive = state.activeSection - 1;
                state.sections.splice(state.activeSection, 1);
                state.activeSection = newActive
            } else {
                if ( action.payload === 1){
                    state.sections[action.payload] = initialState.sections[1];
                } else {
                    state.sections.splice(action.payload, 1);
                }
            }
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
        setHasChanged: (state, action: PayloadAction<{value: boolean, index?: number}>) => {
            if ( action.payload.index === undefined ){
                state.sections[state.activeSection].hasChanged = action.payload.value;
            } else {
                state.sections[action.payload.index].hasChanged = action.payload.value;
            }
        },
        setSummary: (state, action: PayloadAction<Summary>) => {
            state.summary = action.payload;
        },
        updateSectionsCounter: (state, action: PayloadAction<number>) => {
            state.sectionsCounter = action.payload;
        },
        setTransformationMatrix: (state, action: PayloadAction<[number[], number[], number[]]>) => {
            state.transformationMatrix = action.payload;
        },
        cleanSections: (state) => {
            state.sections = state.sections.filter( (_, index) => index === 0 || index === 1);
            state.sections[1] = defaultSections[1]
        }
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
    setHasChanged,
    setSummary,
    updateSectionsCounter,
    setTransformationMatrix,
    cleanSections
} = sectionSlice.actions;

export default sectionSlice.reducer;