import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { defaultCoordinates, defaultDistances, ObliqueMode } from './types';

const initialState: ObliqueMode = {
  drawPoints: false,
  coordinates: defaultCoordinates,
  distances: defaultDistances,
  isDefaultCoordinates: true,
  isDistancesLoaded: false,
  solution: null,
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
  },
});

export const { setObliquePoints, setDrawPoints, setDefaultObliqueState } = obliqueSlice.actions;

export default obliqueSlice.reducer;
