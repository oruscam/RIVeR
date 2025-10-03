import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { defaultCoordinates, defaultDistances, ObliqueMode } from './types';

const initialState: ObliqueMode = {
  drawPoints: false,
  coordinates: defaultCoordinates,
  rwCoordinates: defaultCoordinates,
  distances: defaultDistances,
  isDefaultCoordinates: true,
  isDistancesLoaded: false,
  solution: null,
  extraFields: false
};

const obliqueSlice = createSlice({
  name: 'matrixGenerator',
  initialState,
  reducers: {
    setObliquePoints: (_state, action: PayloadAction<ObliqueMode>) => {
      return action.payload;
    },
    setDrawPoints: (state) => {
      state.drawPoints = !state.drawPoints;
      state.coordinates = defaultCoordinates;
      state.distances = defaultDistances;
      state.isDefaultCoordinates = true;
      state.isDistancesLoaded = false;
      state.solution = null;
    },
    setDefaultObliqueState: () => {
      return initialState;
    },
    setExtraFields: (state) => {
      state.extraFields = !state.extraFields;
    }
  },
});

export const { setObliquePoints, setDrawPoints, setDefaultObliqueState, setExtraFields } = obliqueSlice.actions;

export default obliqueSlice.reducer;
