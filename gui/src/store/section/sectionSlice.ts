import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  SectionState,
  PixelSize,
  Section,
  SectionData,
  Bathimetry,
  Summary,
} from "./types";
import {
  DEFAULT_ALPHA,
  DEFAULT_NUM_STATIONS,
  DEFAULT_POINTS,
} from "../../constants/constants";
import { Point } from "../../types";

const defaultSections = [
  {
    name: "CS_default_1",
    drawLine: false,
    sectionPoints: DEFAULT_POINTS,
    dirPoints: DEFAULT_POINTS,
    bathimetry: {
      path: "",
      name: "",
    },
    pixelSize: { size: 0, rwLength: 0 },
    rwPoints: DEFAULT_POINTS,
    extraFields: false,
    numStations: DEFAULT_NUM_STATIONS,
    alpha: DEFAULT_ALPHA,
    interpolated: true,
    hasChanged: false,
    artificialSeeding: false,
  },
];

const initialState: SectionState = {
  sections: defaultSections,
  summary: undefined,
  activeSection: 0,
  sectionsCounter: 1,
  transformationMatrix: [],
  isSectionWorking: false,
};

const sectionSlice = createSlice({
  name: "data",
  initialState,
  reducers: {
    // ** Interaction with PixelSize.
    setPixelSize: (state, action: PayloadAction<PixelSize>) => {
      state.sections[state.activeSection].pixelSize = action.payload;
      console.log("set pixel size", action.payload);
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
    setSectionData: (
      state,
      action: PayloadAction<{ sectionIndex: number; sectionData: SectionData }>,
    ) => {
      state.sections[action.payload.sectionIndex].data =
        action.payload.sectionData;
      state.sections[action.payload.sectionIndex].artificialSeeding =
        action.payload.sectionData.artificial_seeding;
      state.sections[action.payload.sectionIndex].interpolated =
        action.payload.sectionData.interpolated;
      state.sections[action.payload.sectionIndex].numStations =
        action.payload.sectionData.num_stations
      state.sections[action.payload.sectionIndex].alpha = action.payload.sectionData.alpha;
    },
    changeSectionData: (state, action: PayloadAction<SectionData>) => {
      state.sections[state.activeSection].data = action.payload;
    },
    setBathimetry: (
      state,
      action: PayloadAction<{ bathimetry: Bathimetry; index?: number }>,
    ) => {
      const index =
        action.payload.index === undefined
          ? state.activeSection
          : action.payload.index;
      state.sections[index].bathimetry = action.payload.bathimetry;
      state.sections[index].hasChanged = true;
    },
    setSectionPoints: (
      state,
      action: PayloadAction<{ points: Point[]; index?: number }>,
    ) => {
      const index =
        action.payload.index === undefined
          ? state.activeSection
          : action.payload.index;
      state.sections[index].sectionPoints = action.payload.points;
    },
    setHasChanged: (
      state,
      action: PayloadAction<{ value: boolean; index?: number }>,
    ) => {
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
      }>,
    ) => {
      state.transformationMatrix = action.payload.transformationMatrix;
    },
    resetSectionSlice: (state) => {
      state.sections = defaultSections;
      state.summary = undefined;
      state.activeSection = 0;
      state.sectionsCounter = 1;
    },
    setSectionWorking: (state, action: PayloadAction<boolean>) => {
      state.isSectionWorking = action.payload;
    },
  },
});

export const {
  addSection,
  changeSectionData,
  deleteSection,
  resetSectionSlice,
  setActiveSection,
  setBathimetry,
  setDirPoints,
  setHasChanged,
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
