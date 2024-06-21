import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Point {
    x: number;
    y: number;
}


interface DataState {
    points: Point[];
    image: string,
}


const initialState: DataState = {
    points: [],
    image: "",
};

const dataSlice = createSlice({
    name: 'data',
    initialState,
    reducers: {
        setPoints: (state, action: PayloadAction<Point[]>) => {
            state.points = action.payload;
        },
        clearPoints: (state) => {
            state.points = [];
        },

        //! Cambiar.
        setImage: (state, action: PayloadAction<string>) => {
            state.image = action.payload;
        }
    },
});

export const { setPoints, clearPoints, setImage} = dataSlice.actions;
export default dataSlice.reducer;