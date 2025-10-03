import { configureStore } from '@reduxjs/toolkit';
import uiReducer from './ui/uiSlice';
import sectionReducer from './section/sectionSlice';
import projectReducer from './project/projectSlice';
import dataReducer from './data/dataSlice';
import uavReducer from './uav/uavSlice';
import obliqueReducer from './oblique/obliqueSlice';
import globalReducer from './global/globalSlice';
import ipcamReducer from './ipcam/ipcamSlice';

const store = configureStore({
  reducer: {
    ui: uiReducer,
    project: projectReducer,
    section: sectionReducer,
    data: dataReducer,
    uav: uavReducer,
    global: globalReducer,
    oblique: obliqueReducer,
    ipcam: ipcamReducer,
  },
});

// Get the type of our store variable
type AppStore = typeof store;
export default store;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
