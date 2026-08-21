import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SectionState, PixelSize, Section, SectionData, Bathimetry, Summary } from './types';
import { DEFAULT_ALPHA, DEFAULT_NUM_STATIONS, DEFAULT_POINTS } from '../../constants/constants';
import { Point } from '../../types';

const defaultSections: Section[] = [
  {
    name: 'CS_default_1',
    drawLine: false,
    sectionPoints: DEFAULT_POINTS,
    dirPoints: DEFAULT_POINTS,
    bathimetry: {
      path: undefined,
      name: undefined,
    },
    pixelSize: { size: 0, rwLength: 0 },
    rwPoints: DEFAULT_POINTS,
    extraFields: false,
    numStations: DEFAULT_NUM_STATIONS,
    alpha: DEFAULT_ALPHA,
    interpolated: true,
    hasChanged: false,
    artificialSeeding: false,
    activeTechnique: 'lspiv',
  },
];

const initialState: SectionState = {
  sections: defaultSections,
  summary: undefined,
  activeSection: 0,
  sectionsCounter: 1,
  transformationMatrix: [],
  isSectionWorking: false,
  isDraggingPoint: false,
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
    setDrawLine: (state, action: PayloadAction<boolean>) => {
      state.sections[state.activeSection].drawLine = action.payload;
    },
    setIsDraggingPoint: (state, action: PayloadAction<boolean>) => {
      state.isDraggingPoint = action.payload;
    },
    addSection: (state, action: PayloadAction<Section>) => {
      state.sections.push(action.payload);
      state.activeSection = state.sections.length - 1;
    },
    deleteSection: (state) => {
      if (state.activeSection === 0) {
        state.sections.splice(0, 1);
        state.activeSection = 0;
      } else {
        state.sections.splice(state.activeSection, 1);
        state.activeSection = state.activeSection - 1;
      }
    },
    setActiveSection: (state, action: PayloadAction<number>) => {
      state.activeSection = action.payload;
    },
    updateSection: (state, action: PayloadAction<Section>) => {
      state.sections[state.activeSection] = action.payload;
    },
    setSectionData: (state, action: PayloadAction<{ sectionIndex: number; sectionData: SectionData }>) => {
      state.sections[action.payload.sectionIndex].data = action.payload.sectionData;
      state.sections[action.payload.sectionIndex].artificialSeeding =
        action.payload.sectionData.artificial_seeding;
      state.sections[action.payload.sectionIndex].interpolated = action.payload.sectionData.interpolated;
      state.sections[action.payload.sectionIndex].numStations = action.payload.sectionData.num_stations;
      state.sections[action.payload.sectionIndex].alpha = action.payload.sectionData.alpha;
    },
    changeSectionData: (state, action: PayloadAction<SectionData>) => {
      state.sections[state.activeSection].data = action.payload;
    },
    setBathimetry: (state, action: PayloadAction<{ bathimetry: Bathimetry; index?: number }>) => {
      const index = action.payload.index === undefined ? state.activeSection : action.payload.index;
      state.sections[index].bathimetry = action.payload.bathimetry;
      state.sections[index].hasChanged = true;
    },
    setSectionPoints: (state, action: PayloadAction<{ points: Point[]; index?: number }>) => {
      const index = action.payload.index === undefined ? state.activeSection : action.payload.index;
      state.sections[index].sectionPoints = action.payload.points;
    },
    setHasChanged: (state, action: PayloadAction<{ value: boolean; index?: number }>) => {
      if (action.payload.index === undefined) {
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
    setTransformationMatrix: (
      state,
      action: PayloadAction<{
        transformationMatrix: [number[], number[], number[]];
      }>
    ) => {
      state.transformationMatrix = action.payload.transformationMatrix;
    },
    setDefaultSectionState: (state) => {
      state.sections = defaultSections;
      state.summary = undefined;
      state.activeSection = 0;
      state.sectionsCounter = 1;
    },
    setSectionWorking: (state, action: PayloadAction<boolean>) => {
      state.isSectionWorking = action.payload;
    },
    /**
     * Drop every result derived from the current cross-section geometry.
     *
     * Editing any section's markers changes the mask and ROI, which are built
     * from all sections together, so the PIV run behind every section's results
     * is invalidated — not just the edited one's. Anything left behind renders
     * as though it still described the new geometry: the station search lines
     * in particular prefer `data.east`/`data.north` as authoritative station
     * centres (StationSearchLines.tsx), so stale data pins them to the old
     * positions no matter where the markers moved.
     *
     * Only results are cleared. numStations and alpha are user choices that the
     * backend happens to echo back, so they survive.
     */
    clearResults: (state) => {
      state.sections.forEach((section) => {
        section.data = undefined;
      });
      state.summary = undefined;
    },
  },
});

export const {
  addSection,
  changeSectionData,
  clearResults,
  deleteSection,
  setDefaultSectionState,
  setActiveSection,
  setBathimetry,
  setDirPoints,
  setDrawLine,
  setHasChanged,
  setIsDraggingPoint,
  setPixelSize,
  setRealWorldPoints,
  setSectionData,
  setSectionPoints,
  setSectionWorking,
  setSummary,
  setTransformationMatrix,
  updateSection,
  updateSectionsCounter,
} = sectionSlice.actions;

export default sectionSlice.reducer;
