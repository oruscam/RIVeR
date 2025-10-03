import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface globalState {
  hasChanged: boolean;
  isBackendWorking: boolean;
}

const initialState: globalState = {
  hasChanged: false,
  isBackendWorking: false,
};

const globalSlice = createSlice({
  name: 'global',
  initialState,
  reducers: {
    setHasChanged: (state, action: PayloadAction<boolean>) => {
      state.hasChanged = action.payload;
    },
    setIsBackendWorking: (state, action: PayloadAction<boolean>) => {
      state.isBackendWorking = action.payload;
    },
    resetAll: () => initialState,
  },
});

export const { setHasChanged, setIsBackendWorking, resetAll } = globalSlice.actions;

export default globalSlice.reducer;
