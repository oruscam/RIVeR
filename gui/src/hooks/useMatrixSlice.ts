import { useDispatch, useSelector } from "react-redux"
import { RootState } from "../store/store";
import { CanvasPoint, FormDistance, FormPoint, Point } from "../types";
import { setControlPoints, setDrawPoints } from "../store/matrix/matrixSlice";

export const useMatrixSlice = () => {
    const dispatch = useDispatch();
    const { pixelSize, controlPoints } = useSelector((state: RootState) => state.matrix);

    const onSetDefaultControlCoordinates = ( initPoint: Point, factor ) =>{
        const coordinates = [ 
            {x: initPoint.x * factor, y: initPoint.y * factor},
            {x: (initPoint.x * factor) - 200, y: initPoint.y * factor},
            {x: initPoint.x * factor - 200, y: initPoint.y * factor + 200}, 
            {x: initPoint.x * factor, y: initPoint.y * factor + 200}
        ];

        const d12 = Math.sqrt( Math.pow(coordinates[1].x - coordinates[0].x, 2) + Math.pow(coordinates[1].y - coordinates[0].y, 2) );
            const d13 = Math.sqrt( Math.pow(coordinates[2].x - coordinates[0].x, 2) + Math.pow(coordinates[2].y - coordinates[0].y, 2) );
            const d14 = Math.sqrt( Math.pow(coordinates[3].x - coordinates[0].x, 2) + Math.pow(coordinates[3].y - coordinates[0].y, 2) );
            const d23 = Math.sqrt( Math.pow(coordinates[2].x - coordinates[1].x, 2) + Math.pow(coordinates[2].y - coordinates[1].y, 2) );
            const d24 = Math.sqrt( Math.pow(coordinates[3].x - coordinates[1].x, 2) + Math.pow(coordinates[3].y - coordinates[1].y, 2) );
            const d34 = Math.sqrt( Math.pow(coordinates[3].x - coordinates[2].x, 2) + Math.pow(coordinates[3].y - coordinates[2].y, 2) );

        const distances = {
            d12,
            d13,
            d14,
            d23,
            d24,
            d34,
        }

        const isNotDefaultCoordinates = true;

        dispatch(setControlPoints({ drawPoints: true, coordinates, distances, isNotDefaultCoordinates }));
    } 

    const onChangeControlPoints = ( canvasPoint: CanvasPoint | null, formDistance: FormDistance | null ) => {
        
        if ( canvasPoint ){
            const { points, factor } = canvasPoint;
    
            const coordinates = points.map( point => ({ x: point.x * factor, y: point.y * factor }) );
    
            // TODO: Convert this to a function in helpers
    
            const d12 = Math.sqrt( Math.pow(coordinates[1].x - coordinates[0].x, 2) + Math.pow(coordinates[1].y - coordinates[0].y, 2) );
            const d13 = Math.sqrt( Math.pow(coordinates[2].x - coordinates[0].x, 2) + Math.pow(coordinates[2].y - coordinates[0].y, 2) );
            const d14 = Math.sqrt( Math.pow(coordinates[3].x - coordinates[0].x, 2) + Math.pow(coordinates[3].y - coordinates[0].y, 2) );
            const d23 = Math.sqrt( Math.pow(coordinates[2].x - coordinates[1].x, 2) + Math.pow(coordinates[2].y - coordinates[1].y, 2) );
            const d24 = Math.sqrt( Math.pow(coordinates[3].x - coordinates[1].x, 2) + Math.pow(coordinates[3].y - coordinates[1].y, 2) );
            const d34 = Math.sqrt( Math.pow(coordinates[3].x - coordinates[2].x, 2) + Math.pow(coordinates[3].y - coordinates[2].y, 2) );
    
            const distances = { d12, d13, d14, d23, d24, d34 };
    
            const isNotDefaultCoordinates = true;
    
            dispatch(setControlPoints({ drawPoints: true, coordinates, distances, isNotDefaultCoordinates }));
        }

        if ( formDistance ){
            const { distance, position } = formDistance;
            // const distances = {
            //     d12: position === 'distance_12' ? distance : controlPoints.distances.d12,
            //     d13: position === 'distance_13' ? distance : controlPoints.distances.d13,
            //     d14: position === 'distance_14' ? distance : controlPoints.distances.d14,
            //     d23: position === 'distance_23' ? distance : controlPoints.distances.d23,
            //     d24: position === 'distance_24' ? distance : controlPoints.distances.d24,
            //     d34: position === 'distance_34' ? distance : controlPoints.distances.d34
            // }

            const { coordinates } = controlPoints;

            const newCoordinates = controlPoints.coordinates.map((point,  index) => {
                
                if ( position === 'distance_12' && index === 1 ){
                    const dx = coordinates[1].x - coordinates[0].x;
                    const dy = coordinates[1].y - coordinates[0].y;
                    const angle = Math.atan2(dy, dx);
                    return {
                        x: coordinates[0].x + distance * Math.cos(angle),
                        y: coordinates[0].y + distance * Math.sin(angle)
                    };
                }

                if ( position === 'distance_13' && index === 2 ){
                    const dx = coordinates[2].x - coordinates[0].x;
                    const dy = coordinates[2].y - coordinates[0].y;
                    const angle = Math.atan2(dy, dx);
                    return {
                        x: coordinates[0].x + distance * Math.cos(angle),
                        y: coordinates[0].y + distance * Math.sin(angle)
                    };
                }

                if ( position === 'distance_14'  && index === 3 ){
                    const dx = coordinates[3].x - coordinates[0].x;
                    const dy = coordinates[3].y - coordinates[0].y;
                    const angle = Math.atan2(dy, dx);
                    return {
                        x: coordinates[0].x + distance * Math.cos(angle),
                        y: coordinates[0].y + distance * Math.sin(angle)
                    };
                }

                if ( position === 'distance_23' && index === 2 ){
                    const dx = coordinates[2].x - coordinates[1].x;
                    const dy = coordinates[2].y - coordinates[1].y;
                    const angle = Math.atan2(dy, dx);
                    return {
                        x: coordinates[1].x + distance * Math.cos(angle),
                        y: coordinates[1].y + distance * Math.sin(angle)
                    };
                }

                if ( position === 'distance_24' && index === 3 ){
                    const dx = coordinates[3].x - coordinates[1].x;
                    const dy = coordinates[3].y - coordinates[1].y;
                    const angle = Math.atan2(dy, dx);
                    return {
                        x: coordinates[1].x + distance * Math.cos(angle),
                        y: coordinates[1].y + distance * Math.sin(angle)
                    };
                }

                if ( position === 'distance_34' && index === 3 ){
                    const dx = coordinates[3].x - coordinates[2].x;
                    const dy = coordinates[3].y - coordinates[2].y;
                    const angle = Math.atan2(dy, dx);
                    return {
                        x: coordinates[2].x + distance * Math.cos(angle),
                        y: coordinates[2].y + distance * Math.sin(angle)
                    };
                }
                return point
            });
            

            const d12 = Math.sqrt( Math.pow(newCoordinates[1].x - newCoordinates[0].x, 2) + Math.pow(newCoordinates[1].y - newCoordinates[0].y, 2) );
            const d13 = Math.sqrt( Math.pow(newCoordinates[2].x - newCoordinates[0].x, 2) + Math.pow(newCoordinates[2].y - newCoordinates[0].y, 2) );
            const d14 = Math.sqrt( Math.pow(newCoordinates[3].x - newCoordinates[0].x, 2) + Math.pow(newCoordinates[3].y - newCoordinates[0].y, 2) );
            const d23 = Math.sqrt( Math.pow(newCoordinates[2].x - newCoordinates[1].x, 2) + Math.pow(newCoordinates[2].y - newCoordinates[1].y, 2) );
            const d24 = Math.sqrt( Math.pow(newCoordinates[3].x - newCoordinates[1].x, 2) + Math.pow(newCoordinates[3].y - newCoordinates[1].y, 2) );
            const d34 = Math.sqrt( Math.pow(newCoordinates[3].x - newCoordinates[2].x, 2) + Math.pow(newCoordinates[3].y - newCoordinates[2].y, 2) );

            const isNotDefaultCoordinates = true;

            const distances = {
                d12,
                d13,
                d14,
                d23,
                d24,
                d34
            }

            dispatch(setControlPoints({ drawPoints: true, coordinates: newCoordinates, distances, isNotDefaultCoordinates}))
        }

    }   

    const onSetDrawPoints = () => {
        dispatch(setDrawPoints());
    }

    return {
        // ATRIBUTES
        pixelSize,
        controlPoints,

        // METHODS
        onSetDefaultControlCoordinates,
        onChangeControlPoints,
        onSetDrawPoints
    }
}