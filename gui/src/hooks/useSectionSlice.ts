/**
 * @file useSectionSlice.ts
 * @description This file contains the custom hook to interact with the section slice.
 */

import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { setDirPoints, addSection, setActiveSection, setPixelSize, setRealWorldPoints, updateSection, changeSectionData, setSectionPoints, setBathimetry, setHasChanged, deleteSection, updateSectionsCounter, setTransformationMatrix, resetSectionSlice, setSectionWorking } from '../store/section/sectionSlice';
import { clearMessage, setLoading, setMessage } from '../store/ui/uiSlice';
import { FieldValues } from 'react-hook-form';
import { adapterCrossSections, computePixelSize, getBathimetryValues, getDirectionVector, getIntersectionPoints, getNewCanvasPositions, setChangesByForm, transformPixelToRealWorld, transformRealWorldToPixel } from '../helpers';
import { setProcessingMask, setQuiver, updateProcessingForm } from '../store/data/dataSlice';
import { DEFAULT_ALPHA, DEFAULT_NUM_STATIONS, DEFAULT_POINTS} from '../constants/constants';
import { CanvasPoint, FormPoint, Point } from '../types';
import { getTransformationFromCameraMatrix } from '../helpers/coordinates';
import { ResourceNotFoundError } from '../errors/errors';
import { useTranslation } from 'react-i18next';

/**
 * Interface to define the methods and attributes to interact with the section slice.
 * The section slice contains the information of the pixel_size section (step4) and the cross sections (step5).
 * By default, we have pixel_size and CS_default_1. 
 * @returns - Object with the methods and attributes to interact with the section slice
 */

export const useSectionSlice = () => {
    const { sections, activeSection, summary, sectionsCounter, transformationMatrix, pixelSolution, isSectionWorking } = useSelector((state: RootState) => state.section);
    const { processing } = useSelector((state: RootState) => state.data);
    const { t } = useTranslation() 
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
            const { points, firstFlag, secondFlag } = getNewCanvasPositions(canvasPoint, flag1, flag2)
            newPoints = points
            flag1 = firstFlag
            flag2 = secondFlag
        }

        /**
         * If formPoint is not null, the real world coordinates are being modified by the user in the form.
         * The newPoints variable is calculated by updating the point in the position specified in the formPoint object.
         */

        if(formPoint){
            const { points, firstFlag, secondFlag } = setChangesByForm(formPoint, dirPoints, flag1, flag2)
            newPoints = points
            flag1 = firstFlag
            flag2 = secondFlag
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
         * by converting the pixel points to real world coordinates.
         * The real world coordinates are stored in the section slice.
         * The pixel size is calculated by the difference between the real world coordinates.
         * The pixel size is stored in the section slice.
         */

        if( activeSection >= 0 ){
            let rwCalculated: Point[] = [ {x: 0, y: 0}, {x:0, y: 0}]

            dispatch(setSectionWorking(true))
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
            
            const { size, rwLength}  = computePixelSize(newPoints as Point[], rwCalculated)
            dispatch(setPixelSize({size, rwLength}))
            dispatch(setDirPoints(newPoints as Point[]))

            if( bathimetry.width ){
                onUpdateSectionPoints(rwCalculated as Point[], rwLength, bathimetry.width, bathimetry.leftBank)
            }
            dispatch(setSectionWorking(false))

        } else {
            const { size, rwLength } = computePixelSize(newPoints as Point[], rwPoints)
            dispatch(setPixelSize({size, rwLength}))
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
        const { points, firstFlag, secondFlag } = setChangesByForm({point, position}, rwPoints, flag1, flag2)
        newPoints = points
        flag1 = firstFlag
        flag2 = secondFlag

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

        if(activeSection >= 0 && newPoints !== rwPoints){
            let pixelCalulated: Point[] = [{x: 0, y: 0}, {x: 0, y: 0}]

                dispatch(setSectionWorking(true))
                if( flag1 ){
                    const pix_coordinates = transformRealWorldToPixel(newPoints[0].x, newPoints[0].y, transformationMatrix)
                    pixelCalulated = [{x: pix_coordinates[0], y: pix_coordinates[1]}, dirPoints[1]]
                } else if( flag2 ) {
                    const pix_coordinates = transformRealWorldToPixel(newPoints[1].x, newPoints[1].y, transformationMatrix)
                    pixelCalulated = [dirPoints[0], {x: pix_coordinates[0], y: pix_coordinates[1]}]
                }
                const { size, rwLength}  = computePixelSize(pixelCalulated, newPoints)
                
                dispatch(setPixelSize({size, rwLength}))
                dispatch(setDirPoints(pixelCalulated))
                
                if (bathimetry.width){
                    onUpdateSectionPoints(newPoints as Point[], rwLength, bathimetry.width, bathimetry.leftBank)
                }
                dispatch(setSectionWorking(false))
        } else { 
            const {size, rwLength} = computePixelSize(dirPoints, newPoints)
            dispatch(setPixelSize({size, rwLength}))
            dispatch(setHasChanged({value: true}))
        }
    };

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
            dispatch(setMessage(t('Loader.maskAndRoi')))
            const { height_roi } = await ipcRenderer.invoke('recommend-roi-height', type === 'ipcam' ? { transformationMatrix } : undefined)
            const { maskPath, bbox } = await ipcRenderer.invoke('create-mask-and-bbox', { height_roi: height_roi, data: false })
1            
            dispatch(updateProcessingForm({...processing.form, heightRoi: height_roi}))
            dispatch(setProcessingMask({mask: filePrefix + maskPath, bbox}))
            dispatch(setQuiver({quiver: undefined, test: false}))
            dispatch(setLoading(false))
            dispatch(clearMessage())
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
        pixelSize?: number;
        imageWidth?: number;
        imageHeight?: number;
    }

    const onUpdateSection = (value: Update, cameraMatrix: number[][] | undefined) => {
        const section = sections[activeSection];
        const updatedSection = { ...section };

        if (value.drawLine !== undefined) {
            updatedSection.drawLine = !updatedSection.drawLine;
            updatedSection.dirPoints = [];
            updatedSection.sectionPoints = DEFAULT_POINTS;
            updatedSection.rwPoints = DEFAULT_POINTS;
            updatedSection.pixelSize = { rwLength: 0, size: 0 };
        }

        if (value.sectionName !== undefined) {
            updatedSection.name = value.sectionName;
        }

        if (value.level !== undefined) {
            // If the camera matrix is defined, we neeed to update the transformation matrix. And All the cross sections have to be updated. Because in this module has the same level.
            dispatch(setHasChanged({value: true}))
            if ( cameraMatrix ){
                const transformationMatrix = getTransformationFromCameraMatrix(cameraMatrix, value.level)
                dispatch(setTransformationMatrix({transformationMatrix: transformationMatrix as [number[], number[], number[]]}))
                dispatch(setHasChanged({value: true}))
                window.ipcRenderer.invoke('save-transformation-matrix', { transformationMatrix })


                for ( let i = 0; i < sections.length ; i++){
                    const { bathimetry, rwPoints, pixelSize } = sections[i]
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
                    onUpdateSectionPoints(rwPoints, pixelSize.rwLength, bathWidth, bathimetry.leftBank, i)
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
            
            onUpdateSectionPoints(updatedSection.rwPoints, updatedSection.pixelSize.rwLength, bathWidth, updatedSection.bathimetry.leftBank)
            
            return 
        }

        if (value.leftBank !== undefined) {
            dispatch(setBathimetry({
                bathimetry: {
                    ...section.bathimetry,
                    leftBank: value.leftBank
                }}))
            dispatch(setHasChanged({value: true}))
            
            onUpdateSectionPoints(updatedSection.rwPoints, updatedSection.pixelSize.rwLength, updatedSection.bathimetry.width, value.leftBank)
            
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
            pixelSize: { size: 0, rwLength: 0 },
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


    const onGetBathimetry = async (cameraMatrix: number[][] | undefined, zLimits: { min: number, max: number } | undefined) => {
        const ipcRenderer = window.ipcRenderer;

        try {
            const { path, line, name, error } = await ipcRenderer.invoke('get-bathimetry', { path: undefined, zLimits } )

            if ( error?.message ){
                throw new Error(error.message)
            }

            if ( path !== "" && path !== sections[activeSection].bathimetry.path ){
                
                const { data, error } = cameraMatrix && sections[0].bathimetry.level !== undefined
                    ? { ...getBathimetryValues(line, sections[0].bathimetry.level)}
                    : getBathimetryValues(line);
                
                if ( error ){
                    return error
                }

                if (cameraMatrix && activeSection === 0) {
                    const transformationMatrix = getTransformationFromCameraMatrix(cameraMatrix, data.level);
                    dispatch(setTransformationMatrix({transformationMatrix: transformationMatrix as [number[], number[], number[]]}));
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

                const { pixelSize, rwPoints } = sections[activeSection] 
                onUpdateSectionPoints( rwPoints, pixelSize.rwLength, data.width, data.leftBank)
            }
        } catch (error) {
            console.log(error)
            dispatch(updateSection({...sections[activeSection], bathimetry: {path: "", level: 0, name: ""}, sectionPoints: DEFAULT_POINTS}))
            if (error instanceof Error ){
                throw new ResourceNotFoundError(error.message, t)
            }
        }
    }

    const onUpdateSectionPoints = (points: Point[] | [], total_distance?: number, bathWidth?: number, leftBank?: number, index?: number) => {
        if (points.length === 0) {
            dispatch(setSectionPoints({ points: DEFAULT_POINTS, index }));
            return;
        }

        if (!bathWidth || !total_distance) return;

        console.log('update points ')


        // const directionVector = getDirectionVector(points, total_distance);
        const directionVector = getDirectionVector(points);
        const offset = leftBank ? -leftBank : 0;
        let sectionPoints = [
            {
            x: points[0].x + (directionVector[0] * offset),
            y: points[0].y + (directionVector[1] * offset)
            },
            {
            x: points[0].x + (directionVector[0] * bathWidth) + (directionVector[0] * offset),
            y: points[0].y + (directionVector[1] * bathWidth) + (directionVector[1] * offset)
            }
        ];

        if ( transformationMatrix ) {
            const par1 = transformRealWorldToPixel(sectionPoints[0].x, sectionPoints[0].y, transformationMatrix)
            const par2 = transformRealWorldToPixel(sectionPoints[1].x, sectionPoints[1].y, transformationMatrix)
            sectionPoints = [{x: par1[0], y: par1[1]}, {x: par2[0], y: par2[1]}]
        }

        dispatch(setSectionPoints({ points: sectionPoints, index }));
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
        activeSection,
        isSectionWorking,
        sections,
        pixelSolution,
        summary,
        transformationMatrix,   

        onAddSection,
        onChangeDataValues,
        onCleanSectionsData,
        onDeleteSection,
        onGetBathimetry,
        onResetSectionSlice,
        onSetActiveSection,
        onSetDirPoints,
        onSetExtraFields,
        onSetRealWorld,
        onSetSections,
        onUpdateSection,
    };
}