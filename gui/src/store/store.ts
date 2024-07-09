import { configureStore } from "@reduxjs/toolkit";
import uiReducer from "./ui/uiSlice";
import dataReducer from "./data/dataSlice";

const store = configureStore({
    reducer: {
        ui: uiReducer,
        data: dataReducer
    },
});

// Get the type of our store variable
type AppStore = typeof store
export default store;
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']