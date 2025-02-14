import { useDispatch, useSelector } from "react-redux"
import { RootState } from "../store/store";
import { cameraSolution, CanvasPoint, FormDistance, Point } from "../types";
import { setObliquePoints, setDrawPoints, setHasChanged, setIpcamPoints, setIpcamImages, setActiveImage, setCustomIpcamPoint, setIpcamCameraSolution, setIpcamIsCalculating, setHemispehere } from "../store/matrix/matrixSlice";
import { adapterObliquePointsDistances, appendSolutionToImportedPoints, createSquare} from "../helpers";
import { ScreenSizes } from "../store/ui/types";
import { FieldValues } from "react-hook-form";
import { cleanSections, setTransformationMatrix } from "../store/section/sectionSlice";
import { setLoading } from "../store/ui/uiSlice"
import { CliError, ResourceNotFoundError } from "../errors/errors";
import { useTranslation } from "react-i18next";

export const useMatrixSlice = () => {
    const dispatch = useDispatch();
    const { pixelSize, obliquePoints, hasChanged, ipcam } = useSelector((state: RootState) => state.matrix);
    const { t } = useTranslation()

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

    const onGetDistances = async () => {
        const ipcRenderer = window.ipcRenderer

        const { isDistancesLoaded } = obliquePoints

        if ( isDistancesLoaded ) {
            dispatch(setObliquePoints({ ...obliquePoints, isDistancesLoaded: false, distances: { d12: 0, d13: 0, d23: 0, d24: 0, d34: 0, d41: 0 } }));
            return
        }

        try {
            const { distances, error } = await ipcRenderer.invoke('import-distances')

            if ( error ){
                throw new Error(error.message)
            }

            dispatch(setObliquePoints({ ...obliquePoints, isDistancesLoaded: true, distances }));
        } catch (error) {
            if (error instanceof Error) {
                throw new ResourceNotFoundError(error.message, t); 
            } 
        }
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
                dispatch(setObliquePoints({...obliquePoints, distances: newDistances, isDistancesLoaded: true}));
                dispatch(cleanSections())
                dispatch(setLoading(false))
                dispatch(setHasChanged(false));
            } catch (error) {
                console.log(error)
            }
        }
    }

    const onGetPoints = async () => {
        const ipcRenderer = window.ipcRenderer

        try {
            const data = await ipcRenderer.invoke('import-points', { path: undefined });
           
            dispatch(setIpcamPoints({ points: data.points, path: data.path }));
            dispatch(setIpcamCameraSolution(undefined))
        } catch (error) {
            console.log(error)
        }
    }

    const onGetImages = async ( folderPath: string | undefined ) => {
        const ipcRenderer = window.ipcRenderer

        try {
            const { images, path, error} = await ipcRenderer.invoke('ipcam-images', { folderPath });
            if ( error ){
                throw new Error(error.message)
            }
            
            dispatch(setIpcamImages({
                images: images,
                path: path
            }));
        } catch (error) {
            if ( error instanceof Error ){
                throw new ResourceNotFoundError(error.message, t);
            }
        }
    }

    const changeIpcamPointSelected = ( index: number ) => {
        if ( ipcam.importedPoints === undefined ) return;
        const newPoints = ipcam.importedPoints.map((point, i) => {
            if (i === index) {
                if ( point.selected === true ){
                    return { ...point, selected: !point.selected, image: undefined };
                } else {
                    return { ...point, selected: !point.selected };
                }
            }
            return point;
        });

        dispatch(setIpcamPoints({ points: newPoints, path: undefined }))
    }

    const onChangeActiveImage = ( index: number ) => {
        if ( index !== ipcam.activeImage ){
            dispatch(setActiveImage(index));
        }
    }

    interface setIpcamPointPixelCoordinatesInterface {
        index: number,
        imageSize?: {
            width: number, 
            height: number
        },
        point?: {
            x: number,
            y: number
        } 
    }

    const setIpcamPointPixelCoordinates = ( { index, imageSize, point } : setIpcamPointPixelCoordinatesInterface) => {
        const { importedPoints, activeImage, cameraSolution } = ipcam
        if ( importedPoints === undefined ) return;

        let newPoint = { ...importedPoints[index] }

        // Primer caso, cuando se establece el punto en el centro.
        if ( newPoint.wasEstablished === false && imageSize ){

            newPoint.x = imageSize.width / 2
            newPoint.y = imageSize.height / 2

            dispatch(setCustomIpcamPoint({
                point: newPoint,
                index
            }))
        }   

        // Segundo caso, cuando se establece el punto en una posición diferente al centro.
        if ( point ) {
            newPoint.x = point.x
            newPoint.y = point.y
            newPoint.wasEstablished = true
            newPoint.image = activeImage

            dispatch(setCustomIpcamPoint({
                point: newPoint,
                index
            }))

            if ( cameraSolution !== undefined ){
                dispatch(setIpcamCameraSolution(undefined))
                dispatch(setHasChanged(true))
            }
        }

        // Tercer caso, cuando se hace seleccionable un punto que ya se encuentra establecido. No se hace nada
        if ( newPoint.wasEstablished === true && imageSize ) {

            dispatch(setCustomIpcamPoint({
                point: newPoint,
                index
            }))
        }

    }

    const onGetCameraSolution = async ( mode: string ) => {
        dispatch(setIpcamIsCalculating(true))
        const ipcRenderer = window.ipcRenderer

        const filePrefix = import.meta.env.VITE_FILE_PREFIX;

        try {
            const { data, error }: { data: cameraSolution, error: any } = await ipcRenderer.invoke('calculate-3d-rectification', {
                points: ipcam.importedPoints,
                mode,
                hemisphere: ipcam.hemisphere,
            })

            if ( error ){
                console.log(error)
                throw new Error(error)
            }
            
            const {newImportedPoints, numPoints} = appendSolutionToImportedPoints(ipcam.importedPoints!, data, mode === 'direct-solve')
            delete data.uncertaintyEllipses
            delete data.projectedPoints

            dispatch(setIpcamPoints({ points: newImportedPoints, path: undefined }))
            dispatch(setIpcamCameraSolution({
                ...data,
                orthoImagePath: filePrefix + data.orthoImagePath + `?t=${new Date().getTime()}`,
                mode: mode,
                numPoints: numPoints
            }))
            dispatch(setIpcamIsCalculating(false))
        } catch (error) {
            console.log(error)
            dispatch(setIpcamIsCalculating(false))
            if (error instanceof Error){
                throw new CliError(error.message, t)
            }
        }
    }
    
    const onChangeHemisphere = (type: 'southern-hemisphere' | 'northern-hemisphere') => {
        dispatch(setHemispehere(type))
    }
 
    return {
        // ATRIBUTES
        hasChanged,
        ipcam,
        obliquePoints,
        pixelSize,

        // METHODS
        changeIpcamPointSelected,
        onChangeActiveImage,
        onChangeHemisphere,
        onChangeObliqueCoordinates,
        onGetCameraSolution,
        onGetDistances,
        onGetImages,
        onGetPoints,
        onGetTransformtionMatrix,
        onSetDrawPoints,
        onSetObliqueCoordinates,
        setIpcamPointPixelCoordinates,
    }
}