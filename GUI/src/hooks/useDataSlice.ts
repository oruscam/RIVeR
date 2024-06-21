import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { clearPoints, setImage, setPoints } from '../store/data/dataSlice';

export const useDataSlice = () => {
    const { points, image } = useSelector((state: RootState) => state.data);
    const dispatch = useDispatch();

    const onSetPoints = (points: { x: number; y: number }[], factorX: number, factorY: number, image: string) => {
        const newPoints = points.map(point => {
            return {
                x: point.x * factorX,
                y: point.y * factorY
            };
        });
        dispatch(setPoints(newPoints));
        dispatch(setImage(image))
    }

    const onClearPoints = () => {
        dispatch(clearPoints())
    }

    return { 
        points,
        image,
        onSetPoints,
        onClearPoints
     };
};