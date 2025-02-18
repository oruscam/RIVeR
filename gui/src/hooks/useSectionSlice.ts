/**
 * @file useSectionSlice.ts
 * @description This file contains the custom hook to interact with the section slice.
 */

import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { setDirPoints, addSection, setActiveSection, setPixelSize, setRealWorldPoints, updateSection, changeSectionData, setSectionPoints, setBathimetry, setHasChanged, deleteSection, updateSectionsCounter, setTransformationMatrix, cleanSections, resetSectionSlice } from '../store/section/sectionSlice';
import { setLoading } from '../store/ui/uiSlice';
import { FieldValues } from 'react-hook-form';
import { adapterCrossSections, computePixelSize, getBathimetryValues, getDirectionVector, getIntersectionPoints, transformPixelToRealWorld, transformRealWorldToPixel } from '../helpers';
import { setBackendWorkingFlag, setProcessingMask, updateProcessingForm } from '../store/data/dataSlice';
import { DEFAULT_ALPHA, DEFAULT_NUM_STATIONS, DEFAULT_POINTS} from '../constants/constants';
import { CanvasPoint, FormPoint, Point } from '../types';
import { getTransformationFromCameraMatrix } from '../helpers/coordinates';

/**
 * Interface to define the methods and attributes to interact with the section slice.
 * The section slice contains the information of the pixel_size section (step4) and the cross sections (step5).
 * By default, we have pixel_size and CS_default_1. 
 * @returns - Object with the methods and attributes to interact with the section slice
 */

export const useSectionSlice = () => {
    const { sections, activeSection, summary, sectionsCounter, transformationMatrix } = useSelector((state: RootState) => state.section);
    const { processing } = useSelector((state: RootState) => state.data);
    const dispatch = useDispatch();

    /**
     * 
     * @param canvasPoint | null - Object with the points in pixels and the factor to convert to real world coordinates.
     * @param formPoint | null - Object with the real world coordinates and the position to update. This can be passed in formPixelSize or formCrossSections, by the child component pixelCoordinates.
     */

    const onSetDirPoints = async ( canvasPoint: CanvasPoint | null, formPoint: FormPoint | null, ) => {
        const { rwPoints, dirPoints, bathimetry } = sections[activeSection];
        // Clean section points for better visualization.
        onUpdateSectionPoints([])
        dispatch(setHasChanged({value: true}))

        /**
         * The flags are used to avoid unnecessary calculations.
         * If flag1 is true, the first point is being modified.
         * If flag2 is true, the second point is being modified.
         */

        let flag1 = false;
        let flag2 = false
        
        /**
         * The newPoints variable is used to store the new points after the modification.
        */

        let newPoints; 
        
        /**
         * If canvasPoint is not null, the points are being modified by the user in the canvas.
         */

        if(canvasPoint){
            const { points: canvasPoints, factor, index } = canvasPoint;
            
            /**
             * If index is null, the user is creating a new line.
             * If index is 0, the user is modifying the first point.
             * If index is 1, the user is modifying the second point.
             */

            if( index === null){
                flag1 = true,
                flag2 = true
            } else if ( index === 0){
                flag1 = true
            } else { 
                flag2 = true
            }

            /**
             * The newPoints variable is calculated by multiplying the pixel points by the factor.
             */

            newPoints = canvasPoints.map((point) => {
                return {
                    x: parseFloat((point.x * factor).toFixed(1)),
                    y: parseFloat((point.y * factor).toFixed(1))
                }
            })
        }

        /**
         * If formPoint is not null, the real world coordinates are being modified by the user in the form.
         * The newPoints variable is calculated by updating the point in the position specified in the formPoint object.
         */

        if(formPoint){
            const { point, position } = formPoint;
            if ( position === 'x1' && point !== dirPoints[0].x){
                newPoints = [{x: parseFloat(point as string), y: dirPoints[0].y}, {x: dirPoints[1].x, y: dirPoints[1].y}]
                flag1 = true
            } else if ( position === 'y1' && point !== dirPoints[0].y){
                newPoints = [{x: dirPoints[0].x, y: parseFloat(point as string)}, {x: dirPoints[1].x, y: dirPoints[1].y}]
                flag1 = true
            } else if ( position === 'x2' && point !== dirPoints[1].x){
                newPoints = [{x: dirPoints[0].x, y: dirPoints[0].y}, {x: parseFloat(point as string), y: dirPoints[1].y}]
                flag2 = true
            } else if ( position === 'y2' && point !== dirPoints[1].y){
                newPoints = [{x: dirPoints[0].x, y: dirPoints[0].y}, {x: dirPoints[1].x, y: parseFloat(point as string)}]
                flag2 = true
            } else {
                newPoints = dirPoints
            }
        }

        /**
         * The new points are stored in the section slice, if the points are different from the current points.
         */
        
        if(newPoints){
            if (newPoints[0].x === newPoints[1].x && newPoints[0].y === newPoints[1].y) {
                console.error("Los puntos no pueden ser iguales.");
                newPoints = dirPoints; // Revertir a los puntos originales
                flag1 = false;
                flag2 = false;
                dispatch(setDirPoints(newPoints as Point[]))
            } else {
                dispatch(setDirPoints(newPoints as Point[]))
            }

        }

        if ( canvasPoint?.mode === 'only-pixel') return

        /**
         * If the active section is greater than 0, the real world coordinates are calculated.
         * The real world coordinates are calculated by converting the pixel points to real world coordinates.
         * The real world coordinates are stored in the section slice.
         * The pixel size is calculated by the difference between the real world coordinates.
         * The pixel size is stored in the section slice.
         */

        if( activeSection >= 1 ){
            let rwCalculated: Point[] = [ {x: 0, y: 0}, {x:0, y: 0}]

            dispatch(setBackendWorkingFlag(true))
            if (newPoints && flag1 && flag2) {
                const par1 = transformPixelToRealWorld(newPoints[0].x, newPoints[0].y, transformationMatrix)
                const par2 = transformPixelToRealWorld(newPoints[1].x, newPoints[1].y, transformationMatrix)
                rwCalculated = [{x: par1[0], y: par1[1]}, {x: par2[0], y: par2[1]}]
                dispatch(setRealWorldPoints(rwCalculated))
            } else if (newPoints && flag1){
                const par1 = transformPixelToRealWorld(newPoints[0].x, newPoints[0].y, transformationMatrix)
                rwCalculated = [{x: par1[0], y: par1[1]}, rwPoints[1]]
                dispatch(setRealWorldPoints(rwCalculated))
            } else if (newPoints && flag2){
                const par2 = transformPixelToRealWorld(newPoints[1].x, newPoints[1].y, transformationMatrix)
                rwCalculated = [rwPoints[0], {x: par2[0], y: par2[1]}]
                dispatch(setRealWorldPoints(rwCalculated))
            }
            
            const { size, rw_length}  = computePixelSize(newPoints as Point[], rwCalculated)
            dispatch(setPixelSize({size, rw_length}))
            dispatch(setDirPoints(newPoints as Point[]))

            if( bathimetry.width ){
                onUpdateSectionPoints(newPoints as Point[], rw_length, bathimetry.width, bathimetry.leftBank)
            }
            dispatch(setBackendWorkingFlag(false))

        } else {
            const { size, rw_length } = computePixelSize(newPoints as Point[], rwPoints)
            dispatch(setPixelSize({size, rw_length}))
            dispatch(setHasChanged({value: true}))
        }    
    }

    /**
     * Function to update the real world coordinates of the active section.
     * @param point | string | number - The new value of the real world coordinate.
     * @param position | string - The position of the real world coordinate to update.
     */

    const onSetRealWorld = async (point: string | number, position: string) => {
        const { rwPoints, dirPoints, bathimetry } = sections[activeSection];

        dispatch(setHasChanged({value: true}))
        /**
         * The newPoints variable is used to store the new real world coordinates after the modification.
         * The flags are used to avoid unnecessary calculations.
         * If flag1 is true, the first point is being modified.
         * If flag2 is true, the second point is being modified.
         * If flag1 and flag2 are false, the real world coordinates are not being modified.
         */

        let newPoints: Point[];
        let flag1 = false;
        let flag2 = false
        if ( position === 'x1' && point !== rwPoints[0].x){
            newPoints = [{x: parseFloat(point as string), y: rwPoints[0].y}, {x: rwPoints[1].x, y: rwPoints[1].y}]
            flag1 = true;
        } else if ( position === 'y1' && point !== rwPoints[0].y){
            newPoints = [{x: rwPoints[0].x, y: parseFloat(point as string)}, {x: rwPoints[1].x, y: rwPoints[1].y}]
            flag1 = true;
        } else if ( position === 'x2' && point !== rwPoints[1].x){
            newPoints = [{x: rwPoints[0].x, y: rwPoints[0].y}, {x: parseFloat(point as string), y: rwPoints[1].y}]
            flag2 = true;
        } else if ( position === 'y2' && point !== rwPoints[1].y){
            newPoints = [{x: rwPoints[0].x, y: rwPoints[0].y}, {x: rwPoints[1].x, y: parseFloat(point as string)}]
            flag2 = true;
        } else{
            newPoints = rwPoints
        }

        /**
         * The new real world coordinates are stored in the section slice.
         */
        if(newPoints){
            if( newPoints[0].x === newPoints[1].x && newPoints[0].y === newPoints[1].y){
                console.error("Los puntos no pueden ser iguales.");
                newPoints = rwPoints;
                flag1 = false;
                flag2 = false;
            } else {
                dispatch(setRealWorldPoints(newPoints))
            }
        }

        /**
         * If the active section is greater than 0, the pixel coordinates are calculated.
         * The pixel coordinates are calculated by converting the real world coordinates to pixel coordinates.
         * The pixel coordinates are stored in the section slice.
         * The pixel size is calculated by the difference between the real world coordinates.
         * The pixel size is stored in the section slice.
         */

        if(activeSection >= 1 && newPoints !== rwPoints){
            let pixelCalulated: Point[] = [{x: 0, y: 0}, {x: 0, y: 0}]

                dispatch(setBackendWorkingFlag(true))
                if( flag1 ){
                    const pix_coordinates = transformRealWorldToPixel(newPoints[0].x, newPoints[0].y, transformationMatrix)
                    pixelCalulated = [{x: pix_coordinates[0], y: pix_coordinates[1]}, dirPoints[1]]
                } else if( flag2 ) {
                    const pix_coordinates = transformRealWorldToPixel(newPoints[1].x, newPoints[1].y, transformationMatrix)
                    pixelCalulated = [dirPoints[0], {x: pix_coordinates[0], y: pix_coordinates[1]}]
                }
                const { size, rw_length}  = computePixelSize(pixelCalulated, newPoints)
                
                dispatch(setPixelSize({size, rw_length}))
                dispatch(setDirPoints(pixelCalulated))
                
                if (bathimetry.width){
                    onUpdateSectionPoints(pixelCalulated as Point[], rw_length, bathimetry.width, bathimetry.leftBank)
                }
                dispatch(setBackendWorkingFlag(false))
        } else { 
            const {size, rw_length} = computePixelSize(dirPoints, newPoints)
            dispatch(setPixelSize({size, rw_length}))
            dispatch(setHasChanged({value: true}))
        }
    };

    /**
     * Function to calculate the pixel size of the pixel_size section.
     * @param _data | FieldValues - from useFormHook
     */

    const onSetPixelSize = async ( _data: FieldValues ) => {
        dispatch(setLoading(true))
        
        const { dirPoints, rwPoints, pixelSize, hasChanged } = sections[0]

        if ( hasChanged === false ){
            dispatch(setLoading(false))
            dispatch(setActiveSection(activeSection + 1))
            return
        }
        onCleanSections()
        
        const args = {
            dirPoints,
            rwPoints,
            pixelSize: pixelSize.size,
            rw_length: pixelSize.rw_length,
        }

        const ipcRenderer = window.ipcRenderer;
        try {
            const { uav_matrix } = await ipcRenderer.invoke('pixel-size', args)

            dispatch(setTransformationMatrix(uav_matrix))

            dispatch(setHasChanged({value: false}))
            dispatch(setActiveSection(activeSection + 1))
            dispatch(setLoading(false))
        } catch (error) {
            console.log("ERROR EN SETPIXELSIZE")
            console.log(error)
        }
    }

    /**
     * Function to set the active section.
     * The active section is the section that is being modified by the user.
     * @param index | number - The index of the section to set as active.
     */

    const onSetActiveSection = (index: number) => {
        dispatch(setActiveSection(index))
    }

    /**
     * Function to set the sections in the section slice.
     * And generate the mask and the bounding box of the image with sections data.
     * And get the images to create the carousel.
     * @param formData | FieldValues - from useFormHook
     */

    const onSetSections = async (_formData: FieldValues, type: string) => {
        console.time('set-sections')
        dispatch(setLoading(true))
        
        const filePrefix = import.meta.env.VITE_FILE_PREFIX;

        const ipcRenderer = window.ipcRenderer;
        let updatedSection = [...sections]

        let hasChanged = false    
        for (let i = 0; i < sections.length; i++) {
            if ( i === 0 ) continue
            if ( sections[i].hasChanged === true ){
                hasChanged = true
                break
            }
        }

        if ( sectionsCounter !== sections.length ){
            hasChanged = true
        }
        
        if ( hasChanged === false ){
            dispatch(setLoading(false))
            return
        }

        /**
         * We need to transform pixel points section to real world, for mask and height roight
         * 
         * 
         */

        sections.map(async (section, index) => {
            if (index === 0) return;

            const { sectionPoints } = section;


                const par1 = transformPixelToRealWorld(sectionPoints[0].x, sectionPoints[0].y, transformationMatrix)
                const par2 = transformPixelToRealWorld(sectionPoints[1].x, sectionPoints[1].y, transformationMatrix)


                const rwPoints = [{ x: par1[0], y: par1[1] }, { x: par2[0], y: par2[1] }];

                updatedSection[index] = { ...section, sectionPointsRW: rwPoints };
                dispatch(setHasChanged({value: false, index: index})) 
        });


        dispatch(updateSectionsCounter(sections.length))
        const data = adapterCrossSections(updatedSection);

        /**
         * The sections are stored in the section slice.
         * The height_roi is calculated and stored in the data slice.
         * The mask and the bounding box are created and stored in the data slice.
         * The images are stored in the data slice.
         * The calculation is here because, we have the sections data.
         */

        try {
            await ipcRenderer.invoke('set-sections', { data })
            
            const { height_roi } = await ipcRenderer.invoke('recommend-roi-height', type === 'ipcam' ? { transformationMatrix } : undefined)
            const { maskPath, bbox } = await ipcRenderer.invoke('create-mask-and-bbox', { height_roi: height_roi, data: false })
1            
            dispatch(updateProcessingForm({...processing.form, heightRoi: height_roi}))
            dispatch(setProcessingMask({mask: filePrefix + maskPath, bbox}))
            dispatch(setLoading(false))
            console.timeEnd('set-sections')
        } catch (error) {
            console.log("ERROR EN SETSECTIONS")
            console.log(error)
        }
    }

    /**
     * Function to update the active section.
     * The function is used to update the active section with the values passed in the object.
     * The values that can be updated are:
     * - drawLine: boolean - The flag to draw the line in the canvas.
     * - lineLength: number - The length of the line in the canvas.
     * - sectionName: string - The name of the section.
     * - file: File - The bathimetry file.
     * - level: number - The level of the bathimetry.
     * The values are updated in the section slice.
     * @param value | Update - Object with the values to update the active section.
     */

    interface Update {
        alpha?: number;
        drawLine?: boolean;
        index?: number;
        interpolated?: string;
        leftBank?: number;
        level?: number;
        lineLength?: number;
        numStations?: number;
        sectionName?: string;
        data?: any;
        artificialSeeding?: string;
    }

    const onUpdateSection = (value: Update, cameraMatrix: number[][] | undefined) => {
        const section = sections[activeSection];
        const updatedSection = { ...section };


        if (value.drawLine !== undefined) {
            updatedSection.drawLine = !updatedSection.drawLine;
            updatedSection.dirPoints = [];
            updatedSection.sectionPoints = DEFAULT_POINTS;
            updatedSection.pixelSize = { rw_length: 0, size: 0 };
        }

        if (value.lineLength !== undefined) {
            const resetRealWorld = [{ x: 0, y: 0 }, { x: value.lineLength, y: 0 }];
            const { size, rw_length } = computePixelSize(section.dirPoints, resetRealWorld);
            updatedSection.pixelSize = { size, rw_length };
            updatedSection.rwPoints = resetRealWorld;
            updatedSection.hasChanged = true
        }

        if (value.sectionName !== undefined) {
            updatedSection.name = value.sectionName;
        }

        // if (value.file !== undefined) {
        //     updatedSection.bathimetry = { path: value.file.path, level: 0, name: value.file.name };
        // }

        if (value.level !== undefined) {
            // If the camera matrix is defined, we neeed to update the transformation matrix. And All the cross sections have to be updated. Because in this module has the same level.

            if ( cameraMatrix && activeSection !== 0 ){
                const transformationMatrix = getTransformationFromCameraMatrix(cameraMatrix, value.level)
                dispatch(setTransformationMatrix(transformationMatrix as [number[], number[], number[]]))
                dispatch(setHasChanged({value: true}))
                window.ipcRenderer.invoke('save-transformation-matrix', { transformationMatrix })


                for ( let i = 1; i < sections.length ; i++){
                    const { bathimetry, dirPoints, pixelSize } = sections[i]
                    const intersectionPoints = bathimetry.line ? getIntersectionPoints(bathimetry.line, value.level) : []
                    const bathWidth = intersectionPoints[1].x - intersectionPoints[0].x

                    dispatch(setBathimetry({
                        bathimetry: {
                            ...bathimetry, 
                            level: value.level, 
                            width: bathWidth, 
                            x1Intersection: intersectionPoints[0].x, 
                            x2Intersection: intersectionPoints[1].x
                        },
                        index: i
                    }))
                    onUpdateSectionPoints(dirPoints, pixelSize.rw_length, bathWidth, bathimetry.leftBank, i)
                }
                return
            }
            const intersectionPoints = section.bathimetry.line ? getIntersectionPoints(section.bathimetry.line, value.level) : []
            const bathWidth = intersectionPoints[1].x - intersectionPoints[0].x 

            dispatch(setBathimetry({
                bathimetry: {
                    ...section.bathimetry, 
                    level: value.level, 
                    width: bathWidth, 
                    x1Intersection: intersectionPoints[0].x, 
                    x2Intersection: intersectionPoints[1].x
                }}))
            
            onUpdateSectionPoints(updatedSection.dirPoints, updatedSection.pixelSize.rw_length, bathWidth, updatedSection.bathimetry.leftBank)
            
            return 
        }

        if (value.leftBank !== undefined) {
            dispatch(setBathimetry({
                bathimetry: {
                    ...section.bathimetry,
                    leftBank: value.leftBank
                }}))
            
            onUpdateSectionPoints(updatedSection.dirPoints, updatedSection.pixelSize.rw_length, updatedSection.bathimetry.width, value.leftBank)
            
            return
        }

        if (value.alpha !== undefined) {
            updatedSection.alpha = parseFloat(value.alpha.toFixed(2));
        }

        if (value.numStations !== undefined) {
            updatedSection.numStations = value.numStations;
        }

        if (value.interpolated !== undefined) {
            updatedSection.interpolated = !section.interpolated;
        }

        if ( value.artificialSeeding !== undefined ){
            updatedSection.artificialSeeding = !section.artificialSeeding;
        } 

        dispatch(updateSection(updatedSection));
    };

    /**
     * Function to add a new section to the sections slice.
     * The new section is added to the sections slice.
     * The new section is a copy of the default section.
     * The name of the new section is CS_default_{sectionNumber}.
     * @param sectionNumber | number - The number of the section to add.
     */

    const onAddSection = (sectionNumber: number) => {
        let str = `CS_default_${sectionNumber}`
        while(sections.map(section => section.name).includes(str)){
            sectionNumber += 1
            str = `CS_default_${sectionNumber}`
        }
        const section = {
            name: str,
            drawLine: false,
            sectionPoints: DEFAULT_POINTS,
            dirPoints: DEFAULT_POINTS,
            bathimetry: {
                blob: "",
                path: "",
                name: ""
            },
            pixelSize: { size: 0, rw_length: 0 },
            rwPoints: DEFAULT_POINTS,
            extraFields: false,
            numStations: DEFAULT_NUM_STATIONS,
            alpha: DEFAULT_ALPHA,
            interpolated: true,
            hasChanged: false,
            artificialSeeding: false
        }
        dispatch(addSection(section))
    }

    /**
     * Function to delete the active section.
     * The active section is deleted from the sections slice.
     */

    const onDeleteSection = () => {
        dispatch(deleteSection(-1))
    }

    const onSetExtraFields = () => {
        const section = sections[activeSection]
        dispatch(updateSection({...section, extraFields: !section.extraFields}))
    }

    interface ChangeDataValues {
        type: string;
        rowIndex?: number;
        data?: any;
    }

    const onChangeDataValues = ( object : ChangeDataValues ) => {
        const { data } = sections[activeSection]
        if ( object.type === 'check' && data && object.rowIndex !== undefined){
            const { activeCheck } = data
            const updatedCheck = [...activeCheck];
            updatedCheck[object.rowIndex] = !activeCheck[object.rowIndex];
            
            dispatch(changeSectionData({...data, activeCheck: updatedCheck}));
        }
        if ( object.type === 'showVelocityStd' ){
            if( data ){
                dispatch(changeSectionData({...data, showVelocityStd: !data.showVelocityStd}));
            }
        }
        if ( object.type === 'showPercentile' ){
            if( data ){
                dispatch(changeSectionData({...data, showPercentile: !data.showPercentile}));
            }
        }
    }

    const onGetBathimetry = async (cameraMatrix: number[][] | undefined) => {
        const ipcRenderer = window.ipcRenderer;

        try {
            const data = await ipcRenderer.invoke('get-bathimetry', { path: undefined } )
            const { path, line, name } = data

            if ( data.path !== "" && data.path !== sections[activeSection].bathimetry.path){
                
                const { data, error } = cameraMatrix && sections[1].bathimetry.level !== undefined
                    ? { ...getBathimetryValues(line, sections[1].bathimetry.level)}
                    : getBathimetryValues(line);
                
                if ( error ){
                    return error
                }

                if (cameraMatrix && activeSection === 1) {
                    const transformationMatrix = getTransformationFromCameraMatrix(cameraMatrix, data.level);
                    dispatch(setTransformationMatrix(transformationMatrix as [number[], number[], number[]]));
                    ipcRenderer.invoke('save-transformation-matrix', { transformationMatrix });
                }
                dispatch(setBathimetry({
                    bathimetry: {
                        path: path,
                        name: name, 
                        line: line, 
                        ...data
                    }
                }))

                const { dirPoints, pixelSize } = sections[activeSection] 
                onUpdateSectionPoints(dirPoints, pixelSize.rw_length, data.width, data.leftBank)
            }
        } catch (error) {
            console.log(error)
            dispatch(updateSection({...sections[activeSection], bathimetry: {path: "", level: 0, name: ""}, sectionPoints: DEFAULT_POINTS}))
        }
    }

    const onUpdateSectionPoints = (points: Point[] | [], total_distance?: number, bathWidth?: number, leftBank?: number, index?: number) => {

        if (points.length === 0) {
            dispatch(setSectionPoints({ points: DEFAULT_POINTS, index }));
            return;
        }

        if (!bathWidth || !total_distance) return;

        const directionVector = getDirectionVector(points, total_distance);
        const offset = leftBank ? -leftBank : 0;

        const sectionPoints = [
            {
                x: points[0].x + (directionVector[0] * offset),
                y: points[0].y + (directionVector[1] * offset)
            },
            {
                x: points[0].x + (directionVector[0] * bathWidth) + (directionVector[0] * offset),
                y: points[0].y + (directionVector[1] * bathWidth) + (directionVector[1] * offset)
            }
        ];

        dispatch(setSectionPoints({ points: sectionPoints, index }));
    }

    const onCleanSections = () => {
        dispatch(cleanSections())
    }

    const onCleanSectionsData = () => {
        sections.map((section, index) => {
            if (index === 0) return
            dispatch(updateSection({...section, data: undefined}))
        })
    }

    const onResetSectionSlice = () => {
        dispatch(resetSectionSlice())   
    }

    return {    
        sections,
        activeSection,
        summary,
        transformationMatrix,   

        onAddSection,
        onChangeDataValues,
        onCleanSections,
        onCleanSectionsData,
        onDeleteSection,
        onGetBathimetry,
        onResetSectionSlice,
        onSetActiveSection,
        onSetDirPoints,
        onSetExtraFields,
        onSetPixelSize,
        onSetRealWorld,
        onSetSections,
        onUpdateSection,
    };
}