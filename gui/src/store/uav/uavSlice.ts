import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DEFAULT_POINTS } from '../../constants/constants';
import { Point } from '../../types';
import { UavMode } from './types';

const initialState: UavMode = {
  drawLine: false,
  dirPoints: [],
  rwPoints: DEFAULT_POINTS,
  size: 0,
  rwLength: 0,
  extraFields: false,
  solution: null,
};

const uavSlice = createSlice({
  name: 'matrixGenerator',
  initialState,
  reducers: {
    setPixelSizePoints: (state, action: PayloadAction<{ points: Point[]; type: string }>) => {
      // state.hasChanged = true; // ! REVISAR EN EL HOOK
      state.solution = null;

      if (action.payload.type === 'dir') {
        state.dirPoints = action.payload.points;
      } else {
        state.rwPoints = action.payload.points;
      }
    },
    updatePixelSize: (_state, action: PayloadAction<UavMode>) => {
      return action.payload;
    },
    setDefaultUavState: () => {
      return initialState;
    },
  },
});

export const { setPixelSizePoints, updatePixelSize, setDefaultUavState } = uavSlice.actions;

export default uavSlice.reducer;
