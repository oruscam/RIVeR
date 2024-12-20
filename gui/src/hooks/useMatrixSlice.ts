import { useDispatch, useSelector } from "react-redux"
import { RootState } from "../store/store";
import { CanvasPoint, FormDistance, Point } from "../types";
import { setControlPoints, setDrawPoints, setHasChanged } from "../store/matrix/matrixSlice";
import { adapterControlPointsDistances, createSquare} from "../helpers";
import { ScreenSizes } from "../store/ui/types";
import { FieldValues } from "react-hook-form";
import { setTransformationMatrix } from "../store/section/sectionSlice";
import { setLoading } from "../store/ui/uiSlice";


export const useMatrixSlice = () => {
    const dispatch = useDispatch();
    const { pixelSize, controlPoints, hasChanged } = useSelector((state: RootState) => state.matrix);

    const onSetControlCoordinates = ( points: Point[], screenSizes: ScreenSizes ) => {
        const { imageWidth, imageHeight, factor } = screenSizes;

        const coordinates = createSquare(points[0], points[1], imageWidth!, imageHeight!);

        coordinates.forEach( point => {
            point.x = point.x * factor!;
            point.y = point.y * factor!;
        })

        const isNotDefaultCoordinates = true;
        dispatch(setHasChanged(true));
        dispatch(setControlPoints({ ...controlPoints, drawPoints: true, coordinates, isNotDefaultCoordinates }));
    } 

    const onChangeControlPoints = ( canvasPoint: CanvasPoint | null, _formDistance: FormDistance | null ) => {
        
        if ( canvasPoint ){
            const { points, factor } = canvasPoint;
    
            const coordinates = points.map( point => ({ x: point.x * factor, y: point.y * factor }) );
    
            const isNotDefaultCoordinates = true;
            
            dispatch(setHasChanged(true));
            dispatch(setControlPoints({ ...controlPoints, drawPoints: true, coordinates, isNotDefaultCoordinates }));
            return
        }
    }   

    const onSetDrawPoints = () => {
        dispatch(setDrawPoints());
    }

    const onGetTransformtionMatrix = async (type: 'uav' | 'ipcam' | 'oblique', formDistances: FieldValues) => {
        dispatch(setLoading(true))

        if ( type === 'oblique'){
            const { coordinates, distances } = controlPoints;
            const newDistances = adapterControlPointsDistances(formDistances);
            
            for (const key in newDistances) {
                if (newDistances[key as keyof typeof distances] !== distances[key as keyof typeof distances]) {
                    dispatch(setHasChanged(true));
                    break;
                }
            }

            if ( hasChanged === false ) {
                dispatch(setLoading(false));
                return;
            };

            const ipcRenderer = window.ipcRenderer
            try {   
                const { oblique_matrix } = await ipcRenderer.invoke('set-control-points', {coordinates, distances})

                dispatch(setTransformationMatrix(oblique_matrix));
                dispatch(setControlPoints({...controlPoints, distances}));
                dispatch(setLoading(false))
                dispatch(setHasChanged(false));
            } catch (error) {
                console.log(error)
            }


        }
    }

    return {
        // ATRIBUTES
        pixelSize,
        controlPoints,
        hasChanged,

        // METHODS
        onSetControlCoordinates,
        onChangeControlPoints,
        onSetDrawPoints,
        onGetTransformtionMatrix
    }
}