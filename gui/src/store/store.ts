import { configureStore } from "@reduxjs/toolkit";
import uiReducer from "./ui/uiSlice";
import sectionReducer from "./section/sectionSlice";
import projectReducer from "./project/projectSlice";
import dataReducer from "./data/dataSlice";
import matrixReducer from "./matrix/matrixSlice";

const store = configureStore({
  reducer: {
    ui: uiReducer,
    project: projectReducer,
    section: sectionReducer,
    data: dataReducer,
    matrix: matrixReducer,
  },
});

// Get the type of our store variable
type AppStore = typeof store;
export default store;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
