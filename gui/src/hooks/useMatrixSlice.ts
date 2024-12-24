import { useDispatch, useSelector } from "react-redux"
import { RootState } from "../store/store";
import { CanvasPoint, FormDistance, Point } from "../types";
import { setObliquePoints, setDrawPoints, setHasChanged } from "../store/matrix/matrixSlice";
import { adapterObliquePointsDistances, createSquare} from "../helpers";
import { ScreenSizes } from "../store/ui/types";
import { FieldValues } from "react-hook-form";
import { cleanSections, setTransformationMatrix } from "../store/section/sectionSlice";
import { setLoading } from "../store/ui/uiSlice"

export const useMatrixSlice = () => {
    const dispatch = useDispatch();
    const { pixelSize, obliquePoints, hasChanged } = useSelector((state: RootState) => state.matrix);

    const onSetObliqueCoordinates = ( points: Point[], screenSizes: ScreenSizes ) => {
        const { imageWidth, imageHeight, factor } = screenSizes;

        const coordinates = createSquare(points[0], points[1], imageWidth!, imageHeight!);

        coordinates.forEach( point => {
            point.x = point.x * factor!;
            point.y = point.y * factor!;
        })

        const isDefaultCoordinates = false;
        dispatch(setHasChanged(true));
        dispatch(setObliquePoints({ ...obliquePoints, drawPoints: true, coordinates, isDefaultCoordinates }));
    } 

    const onChangeObliqueCoordinates = ( canvasPoint: CanvasPoint | null, _formDistance: FormDistance | null ) => {
        
        if ( canvasPoint ){
            const { points, factor } = canvasPoint;
    
            const coordinates = points.map( point => ({ x: point.x * factor, y: point.y * factor }) );
    
            const isDefaultCoordinates = false;
            
            dispatch(setHasChanged(true));
            dispatch(setObliquePoints({ ...obliquePoints, drawPoints: true, coordinates, isDefaultCoordinates }));
            return
        }
    }   

    const onSetDrawPoints = () => {
        dispatch(setDrawPoints());
    }

    const onGetTransformtionMatrix = async (type: 'uav' | 'ipcam' | 'oblique', formDistances: FieldValues) => {
        dispatch(setLoading(true))

        if ( type === 'oblique'){
            const { coordinates, distances } = obliquePoints;
            const newDistances = adapterObliquePointsDistances(formDistances);

            let changed = hasChanged
            
            for (const key in newDistances) {
                if (newDistances[key as keyof typeof distances] !== distances[key as keyof typeof distances]) {
                    changed = true;
                    break;
                }
            }

            if ( changed === false ) {
                dispatch(setLoading(false));
                return;
            };

            const ipcRenderer = window.ipcRenderer
            try {   
                const { oblique_matrix } = await ipcRenderer.invoke('set-control-points', {coordinates, distances: newDistances})

                dispatch(setTransformationMatrix(oblique_matrix));
                dispatch(setObliquePoints({...obliquePoints, distances: newDistances}));
                dispatch(cleanSections())
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
        obliquePoints,
        hasChanged,

        // METHODS
        onSetObliqueCoordinates,
        onChangeObliqueCoordinates,
        onSetDrawPoints,
        onGetTransformtionMatrix
    }
}