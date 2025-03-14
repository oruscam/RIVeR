import { useDispatch, useSelector } from "react-redux"
import { RootState } from "../store/store";
import { cameraSolution, CanvasPoint, FormDistance, FormPoint, Point, UpdatePixelSize } from "../types";
import { setObliquePoints, setDrawPoints, setHasChanged, setIpcamPoints, setIpcamImages, setActiveImage, setCustomIpcamPoint, setIpcamCameraSolution, resetMatrixSlice, setPixelSizePoints, updatePixelSize, setIsBackendWorking } from "../store/matrix/matrixSlice";
import { adapterObliquePointsDistances, appendSolutionToImportedPoints, computePixelSize, computeRwDistance, createSquare, getLinesCoordinates, getNewCanvasPositions, setChangesByForm, transformPixelToRealWorld} from "../helpers";
import { ScreenSizes } from "../store/ui/types";
import { FieldValues } from "react-hook-form";
import { resetSectionSlice, setTransformationMatrix } from "../store/section/sectionSlice";
import { CliError, ResourceNotFoundError } from "../errors/errors";
import { useTranslation } from "react-i18next";
import { DEFAULT_POINTS } from "../constants/constants";

export const useMatrixSlice = () => {
    const dispatch = useDispatch();
    const { obliquePoints, hasChanged, ipcam, pixelSize, isBackendWorking } = useSelector((state: RootState) => state.matrix);
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
        dispatch(setObliquePoints({ ...obliquePoints, drawPoints: true, coordinates, isDefaultCoordinates, solution: undefined }));
    } 

    const onChangeObliqueCoordinates = ( canvasPoint: CanvasPoint | null, _formDistance: FormDistance | null ) => {
        
        if ( canvasPoint ){
            const { points, factor } = canvasPoint;
    
            const coordinates = points.map( point => ({ x: point.x * factor, y: point.y * factor }) );
    
            const isDefaultCoordinates = false;
            
            dispatch(setHasChanged(true));
            dispatch(setObliquePoints({ ...obliquePoints, drawPoints: true, coordinates, isDefaultCoordinates, solution: undefined }));
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
            dispatch(setObliquePoints({ ...obliquePoints, isDistancesLoaded: false, distances: { d12: 0, d13: 0, d23: 0, d24: 0, d34: 0, d41: 0 }, solution: undefined }));
            return
        }

        try {
            const { distances, error } = await ipcRenderer.invoke('import-distances')

            if ( error ){
                throw new Error(error.message)
            }
            dispatch(resetSectionSlice())
            dispatch(setObliquePoints({ ...obliquePoints, isDistancesLoaded: true, distances, solution: undefined }));  
            dispatch(setHasChanged(true));
        } catch (error) {
            if (error instanceof Error) {
                throw new ResourceNotFoundError(error.message, t); 
            } 
        }
    }

    const onGetTransformationMatrix = async ( type: 'uav' | 'ipcam' | 'oblique', formDistances?: FieldValues ) => {
        dispatch(setIsBackendWorking(true))

        const ipcRenderer = window.ipcRenderer;
        const filePrefix = import.meta.env.VITE_FILE_PREFIX;

        if ( type === 'oblique' && formDistances ){
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
                dispatch(setIsBackendWorking(false));
                return;
            };

            try {   
                const { obliqueMatrix, extent, resolution, roi, transformed_image_path, error } = await ipcRenderer.invoke('set-control-points', { coordinates, distances: newDistances })

                const orthoImage = filePrefix + transformed_image_path + `?t=${new Date().getTime()}`

                if ( error?.message ){
                    throw new Error(error.message)
                } 

                const rwCoordinates = coordinates.map( point => {
                    const cord1 = transformPixelToRealWorld(point.x, point.y, obliqueMatrix)
                    return { x: cord1[0], y: cord1[1] }
                })

                dispatch(setTransformationMatrix({ transformationMatrix: obliqueMatrix }));
                dispatch(setObliquePoints({ ...obliquePoints, distances: newDistances, isDistancesLoaded: true, solution: { orthoImage, extent, resolution, roi }, rwCoordinates: rwCoordinates }));
                dispatch(setHasChanged(false));
                dispatch(setIsBackendWorking(false))
                dispatch(resetSectionSlice())

            } catch (error) {
                console.log(error)
                if (error instanceof Error){
                    throw new CliError(error.message, t)
                }
            }
        }

        if ( type === 'uav' ) {
            const { dirPoints, rwPoints, size, rwLength } = pixelSize
            
            if ( hasChanged === false ){
                dispatch(setIsBackendWorking(false))
                return
            }
            
            const args = {
                dirPoints, 
                rwPoints,
                pixelSize: size,
                rwLength: rwLength
            }

            try {
                const { uavMatrix, transformed_image_path, output_resolution, extent, error } = await ipcRenderer.invoke('set-pixel-size', args)

                const secondPoint = transformPixelToRealWorld(dirPoints[1].x, dirPoints[1].y, uavMatrix)

                const orthoImage = filePrefix + transformed_image_path + `?t=${new Date().getTime()}`


                dispatch(setTransformationMatrix({ transformationMatrix: uavMatrix }));
                dispatch(updatePixelSize({
                    ...pixelSize,
                    solution: {
                        orthoImage: orthoImage,
                        resolution: output_resolution,
                        extent: extent,
                        secondPoint: { x: secondPoint[0], y: secondPoint[1] }
                    }
                }))
                dispatch(setHasChanged(false))
                dispatch(setIsBackendWorking(false))
                dispatch(resetSectionSlice())
            } catch (error) {   
                console.log(error)
            }
        }
    }

    const onGetPoints = async () => {
        const ipcRenderer = window.ipcRenderer

        try {
            const { data, error } = await ipcRenderer.invoke('import-points', { path: undefined });
            
            if ( error?.message ){
                throw new Error(error.message)
            }

            dispatch(setIpcamPoints({ points: data.points, path: data.path, counter: data.points.length, zLimits: data.zLimits }));
            dispatch(setIpcamCameraSolution(undefined))
        } catch (error) {
            if ( error instanceof Error ){
                throw new ResourceNotFoundError(error.message, t);
            }
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

    const onChangeIpcamPointSelected = ( { index, rowsIndex } : {index?: number, rowsIndex?: number} ) => {
        if ( ipcam.importedPoints === undefined ) return;
        
        let value = 0 
        if ( index !== undefined && index >= 0 ){
            const newPoints = ipcam.importedPoints.map((point, i) => {
                if (i === index) {
                    if ( point.selected === true ){
                        value = -1
                        return { ...point, selected: !point.selected, image: undefined };
                    } else {
                        value = 1
                        return { ...point, selected: !point.selected };
                    }
                }
                return point;
            });
    
            dispatch(setIpcamPoints({ points: newPoints, path: undefined, counter: ipcam.selectedCounter + value }))
        } else if ( rowsIndex !== undefined ){
            const value = rowsIndex === ipcam.importedPoints.length ? true : false;

            if ( rowsIndex !== ipcam.importedPoints.filter(v => v.selected).length ){
                const newPoints = ipcam.importedPoints.map((point, _i) => {
                    return { ...point, selected: value };
                });
        
                dispatch(setIpcamPoints({ points: newPoints, path: undefined, counter: value ? ipcam.importedPoints.length : 0 }))
            }
        }
    }

    const onChangeActiveImage = ( index: number ) => {
        if ( index !== ipcam.activeImage ) {
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
        },
        clickIcon?: boolean
    }

    const setIpcamPointPixelCoordinates = ( { index, imageSize, point, clickIcon } : setIpcamPointPixelCoordinatesInterface) => {
        const { importedPoints, activeImage, cameraSolution } = ipcam
        if ( importedPoints === undefined ) return;

        let newPoint = { ...importedPoints[index] }

        // Primer caso, cuando se establece el punto en el centro.
        if ( newPoint.wasEstablished === false && imageSize ){

            newPoint.x = parseFloat((imageSize.width / 2).toFixed(1))
            newPoint.y = parseFloat((imageSize.height / 2).toFixed(1))

            dispatch(setCustomIpcamPoint({
                point: newPoint,
                index
            }))
        }   

        // Segundo caso, cuando se establece el punto en una posición diferente al centro.
        if ( point ) {
            newPoint.x = parseFloat((point.x).toFixed(1))
            newPoint.y = parseFloat((point.y).toFixed(1))
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

        // 4th option, when the point is established and the user only click the icon. 
        if ( index !== undefined && clickIcon ){
            dispatch(setCustomIpcamPoint({
                point: newPoint,
                index
            }))
        }

    }

    const onGetCameraSolution = async ( mode: string ) => {
        dispatch(setIsBackendWorking(true))
        const ipcRenderer = window.ipcRenderer

        const filePrefix = import.meta.env.VITE_FILE_PREFIX;

        try {
            const { data, error }: { data: cameraSolution, error: any } = await ipcRenderer.invoke('calculate-3d-rectification', {
                points: ipcam.importedPoints,
                mode,
            })

            if ( error ){
                console.log(error)
                throw new Error(error)
            }
            
            const {newImportedPoints, numPoints} = appendSolutionToImportedPoints(ipcam.importedPoints!, data, mode === 'direct-solve')
            delete data.uncertaintyEllipses
            delete data.projectedPoints

            dispatch(setIpcamPoints({ points: newImportedPoints, path: undefined, counter: numPoints }))
            dispatch(setIpcamCameraSolution({
                ...data,
                orthoImagePath: filePrefix + data.orthoImagePath + `?t=${new Date().getTime()}`,
                mode: mode,
                numPoints: numPoints
            }))
            dispatch(setIsBackendWorking(false))
            dispatch(resetSectionSlice())
        } catch (error) {
            console.log(error)
            dispatch(setIsBackendWorking(false))
            if (error instanceof Error){
                throw new CliError(error.message, t)
            }
        }
    }
    
    const onResetMatrixSlice = () => {
        dispatch(resetMatrixSlice())
    }

    const onSetPixelDirection = ( canvasPoints: CanvasPoint | null, formPoint: FormPoint | null) => {
        const { dirPoints } = pixelSize

        console.log('ON SET PIXEL DIRECTION')

        /**
         * The flags are used to avoid unnecessary calculations
         * If flag1 is true, the first points is being modified
         * If flag2 is true, the second points is being modified
         */

        let flag1 = false;
        let flag2 = false;

        // The newPoints variable is used to store newPoints after the modification
        let newPoints;
        
        // If canvasPoints is null, the user is modifying the points manually.
        // Or creating a new line.
        if ( canvasPoints ) {
            const { points, firstFlag, secondFlag} = getNewCanvasPositions(canvasPoints, flag1, flag2)

            newPoints = points;
            flag1 = firstFlag;
            flag2 = secondFlag;
        }
        
        /**
         * If formPoint is not null, the real world coordinates are being modified by the user in the form.
         * The newPoints variable is calculated by updating the point in the position specified in the formPoint object.
         */

        if (formPoint){
            const { points, firstFlag, secondFlag } = setChangesByForm(formPoint, dirPoints, flag1, flag2)
            newPoints = points;
            flag1 = firstFlag;
            flag2 = secondFlag;
        }

        // The new points are stored in the state, if the points are diferent form the current points.

        if ( newPoints ){
            console.log('if 1')
            if (newPoints[0].x === newPoints[1].x && newPoints[0].y === newPoints[1].y) {
                newPoints = dirPoints; // Revertir a los puntos originales
                flag1 = false;
                flag2 = false;
                dispatch(setPixelSizePoints({ points: newPoints, type: 'dir' }))
            } else {
                dispatch(setPixelSizePoints({ points: newPoints, type: 'dir' }))
            }
        }

        return
    }

    const onSetPixelRealWorld = ( point: string | number, position: string) => {
        const { rwPoints } = pixelSize

        let newPoints;
        let flag1 = false;
        let flag2 = false;

        const { points, firstFlag, secondFlag } = setChangesByForm({ point, position }, rwPoints, flag1, flag2)

        newPoints = points;
        flag1 = firstFlag;
        flag2 = secondFlag;

        /**
         * The new real world coordinates are stored in the section slice.
         */

        if (newPoints){
            if( newPoints[0].x === newPoints[1].x && newPoints[0].y === newPoints[1].y){
                console.error("Los puntos no pueden ser iguales.");
                newPoints = rwPoints;
                flag1 = false;
                flag2 = false;
            } else {
                dispatch(setPixelSizePoints( { points: newPoints, type: 'rw' }))
            }
        }
    }
    
    const onUpdatePixelSize = ( value: UpdatePixelSize) => {    
        const { dirPoints } = pixelSize
        const updatedPixelSize = { ...pixelSize }

        if ( value.drawLine !== undefined ){
            updatedPixelSize.drawLine = !updatedPixelSize.drawLine
            updatedPixelSize.dirPoints = []
            updatedPixelSize.rwPoints = DEFAULT_POINTS
            updatedPixelSize.size = 0
            updatedPixelSize.rwLength = 0
            updatedPixelSize.solution = undefined

        }

        if ( value.length !== undefined ){
            const resetRealWorld = [{ x: 0, y: 0 }, { x: value.length, y: 0 }];
            const { size, rwLength } = computePixelSize(dirPoints, resetRealWorld)
            updatedPixelSize.size = size
            updatedPixelSize.rwLength = rwLength
            updatedPixelSize.rwPoints = resetRealWorld
            updatedPixelSize.solution = undefined
        }

        if ( value.pixelSize !== undefined ) {
            if ( (dirPoints[0] === DEFAULT_POINTS[0] && dirPoints[1] === DEFAULT_POINTS[1]) || dirPoints.length === 0 ){
                const newDirPoints = getLinesCoordinates(value.imageWidth!, value.imageHeight!)
                const rwLength = computeRwDistance(newDirPoints, value.pixelSize)
                updatedPixelSize.dirPoints = newDirPoints
                updatedPixelSize.size = value.pixelSize
                updatedPixelSize.rwLength = rwLength
                updatedPixelSize.rwPoints = [{ x: 0, y: 0 }, { x: rwLength, y: 0 }]
                updatedPixelSize.drawLine = true
                updatedPixelSize.solution = undefined

            } else {
                const rwLength = computeRwDistance(dirPoints, value.pixelSize)
                updatedPixelSize.size = value.pixelSize
                updatedPixelSize.rwLength = rwLength
                updatedPixelSize.rwPoints = [{ x: 0, y: 0 }, { x: rwLength, y: 0 }]
                updatedPixelSize.solution = undefined
            }
        }

        if ( value.extraFields !== undefined ) {
            updatedPixelSize.extraFields = !updatedPixelSize.extraFields
        } 
        dispatch(updatePixelSize(updatedPixelSize))
    }

    return {
        // ATRIBUTES
        hasChanged,
        ipcam,
        obliquePoints,
        pixelSize,
        isBackendWorking,

        // METHODS
        onChangeActiveImage,
        onChangeIpcamPointSelected,
        onChangeObliqueCoordinates,
        onGetCameraSolution,
        onGetDistances,
        onGetImages,
        onGetPoints,
        onGetTransformationMatrix,
        onResetMatrixSlice,
        onSetDrawPoints,
        onSetObliqueCoordinates,
        onSetPixelDirection,
        onSetPixelRealWorld,
        onUpdatePixelSize,
        setIpcamPointPixelCoordinates,
    }
}