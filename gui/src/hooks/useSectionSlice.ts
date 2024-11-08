/**
 * @file useSectionSlice.ts
 * @description This file contains the custom hook to interact with the section slice.
 */

import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { setDirPoints, addSection, deleteSection, setActiveSection, setPixelSize, setRealWorldPoints, updateSection, changeSectionData, setSectionPoints, setBathimetry, } from '../store/section/sectionSlice';
import { setLoading } from '../store/ui/uiSlice';
import { FieldValues } from 'react-hook-form';
import { adapterCrossSections, computePixelSize, getBathimetryValues, getDirectionVector, getIntersectionPoints } from '../helpers';
import { setImages, setProcessingMask, updateProcessingForm } from '../store/data/dataSlice';

import { DEFAULT_ALPHA, DEFAULT_NUM_STATIONS, DEFAULT_POINTS} from '../constants/constants';
import { CanvasPoint, FormPoint, Point } from '../types';

/**
 * Interface to define the methods and attributes to interact with the section slice.
 * The section slice contains the information of the pixel_size section (step4) and the cross sections (step5).
 * By default, we have pixel_size and CS_default_1. 
 * @returns - Object with the methods and attributes to interact with the section slice
 */

export const useSectionSlice = () => {
    const { sections, activeSection } = useSelector((state: RootState) => state.section);
    const { processing } = useSelector((state: RootState) => state.data);
    const dispatch = useDispatch();

    /**
     * 
     * @param canvasPoint | null - Object with the points in pixels and the factor to convert to real world coordinates.
     * @param formPoint | null - Object with the real world coordinates and the position to update. This can be passed in formPixelSize or formCrossSections, by the child component pixelCoordinates.
     */

    const onSetDirPoints = async ( canvasPoint: CanvasPoint | null, formPoint: FormPoint | null, ) => {
        const { rwPoints, dirPoints, bathimetry } = sections[activeSection];
        console.log('onSetDirPoints')   
        console.log(canvasPoint)

        // Clean section points for better visualization.
        onUpdateSectionPoints([])

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
            
            console.log('flag 1', flag1)
            console.log('flag 2', flag2)


            const ipcRenderer = window.ipcRenderer;
            try {
                if (newPoints && flag1 && flag2) {
                    console.log('two points')
                    const {rw_coordinates: par1} = await ipcRenderer.invoke('pixel-to-real-world', { points: {x: newPoints[0].x, y: newPoints[0].y}})
                    const {rw_coordinates: par2} = await ipcRenderer.invoke('pixel-to-real-world', { points: {x: newPoints[1].x, y: newPoints[1].y}})
                    rwCalculated = [{x: par1[0], y: par1[1]}, {x: par2[0], y: par2[1]}]
                    dispatch(setRealWorldPoints(rwCalculated))
                } else if (newPoints && flag1){
                    const {rw_coordinates: par1} = await ipcRenderer.invoke('pixel-to-real-world', { points: {x: newPoints[0].x, y: newPoints[0].y}})
                    rwCalculated = [{x: par1[0], y: par1[1]}, rwPoints[1]]
                    dispatch(setRealWorldPoints(rwCalculated))
                } else if (newPoints && flag2){
                    const {rw_coordinates: par2} = await ipcRenderer.invoke('pixel-to-real-world', { points: {x: newPoints[1].x, y: newPoints[1].y}})
                    rwCalculated = [rwPoints[0], {x: par2[0], y: par2[1]}]
                    dispatch(setRealWorldPoints(rwCalculated))
                }
                
                const { size, rw_length}  = computePixelSize(newPoints as Point[], rwCalculated)
                dispatch(setPixelSize({size, rw_length}))
                dispatch(setDirPoints(newPoints as Point[]))

                if( bathimetry.width ){
                    onUpdateSectionPoints(newPoints as Point[], rw_length, bathimetry.width, bathimetry.leftBank)
                }

            } catch (error) {
                console.log("Error calculando real-world-coordinates")
            }
        } else {
            const {size, rw_length} = computePixelSize(newPoints as Point[], rwPoints)
            dispatch(setPixelSize({size, rw_length}))
        }    

    }

    /**
     * Function to update the real world coordinates of the active section.
     * @param point | string | number - The new value of the real world coordinate.
     * @param position | string - The position of the real world coordinate to update.
     */

    const onSetRealWorld = async (point: string | number, position: string) => {
        const { rwPoints, dirPoints, bathimetry } = sections[activeSection];

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
            const ipcRenderer = window.ipcRenderer;
            try {
                if( flag1 ){
                    const {pix_coordinates} = await ipcRenderer.invoke('real-world-to-pixel', { points: {x: newPoints[0].x, y: newPoints[0].y }})
                    pixelCalulated = [{x: pix_coordinates[0], y: pix_coordinates[1]}, dirPoints[1]]
                } else if( flag2 ) {
                    const {pix_coordinates} = await ipcRenderer.invoke('real-world-to-pixel', { points: {x: newPoints[1].x, y: newPoints[1].y }})
                    pixelCalulated = [dirPoints[0], {x: pix_coordinates[0], y: pix_coordinates[1]}]
                }
                const { size, rw_length}  = computePixelSize(pixelCalulated, newPoints)
                
                dispatch(setPixelSize({size, rw_length}))
                dispatch(setDirPoints(pixelCalulated))
                
                if (bathimetry.width){
                    onUpdateSectionPoints(pixelCalulated as Point[], rw_length, bathimetry.width, bathimetry.leftBank)
                }

            } catch (error) {
                console.log("Error calculando pixel-coordinates")
            }
        } else{ 
            const {size, rw_length} = computePixelSize(dirPoints, newPoints)
            dispatch(setPixelSize({size, rw_length}))
        }
    };

    /**
     * Function to calculate the pixel size of the pixel_size section.
     * @param _data | FieldValues - from useFormHook
     */

    const onSetPixelSize = async ( _data: FieldValues ) => {
        dispatch(setLoading(true))
        
        const { dirPoints, rwPoints, pixelSize } = sections[0]
        const args = {
            dirPoints,
            rwPoints,
            pixelSize: pixelSize.size,
            rw_length: pixelSize.rw_length,
        }

        const ipcRenderer = window.ipcRenderer;
        try {
            await ipcRenderer.invoke('pixel-size', args)
            
            dispatch(setLoading(false))
            dispatch(setActiveSection(activeSection + 1))
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

    const onSetSections = async (_formData: FieldValues) => {
        dispatch(setLoading(true))
        
        const filePrefix = import.meta.env.VITE_FILE_PREFIX;

        const ipcRenderer = window.ipcRenderer;
        let updatedSection = [...sections]

        /**
         * We need to transform pixel points section to real world, for mask and height roight
         * 
         * 
         */

        await Promise.all(sections.map(async (section, index) => {
            if (index === 0) return;

            const { sectionPoints } = section;

            try {
                const { rw_coordinates: par1 } = await ipcRenderer.invoke('pixel-to-real-world', { points: { x: sectionPoints[0].x, y: sectionPoints[0].y } });
                const { rw_coordinates: par2 } = await ipcRenderer.invoke('pixel-to-real-world', { points: { x: sectionPoints[1].x, y: sectionPoints[1].y } });

                const rwPoints = [{ x: par1[0], y: par1[1] }, { x: par2[0], y: par2[1] }];
                updatedSection[index] = { ...section, sectionPointsRW: rwPoints }; 
            } catch (error) {
                console.log(error);
            }
        }));

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
            const { height_roi } = await ipcRenderer.invoke('recommend-roi-height')
            const { maskPath } = await ipcRenderer.invoke('create-mask-and-bbox', { height_roi: height_roi })

            const images = await ipcRenderer.invoke('get-images')
            
            dispatch(setImages(images))
            dispatch(updateProcessingForm({...processing.form, heightRoi: height_roi}))
            dispatch(setProcessingMask(filePrefix + maskPath))
            dispatch(setLoading(false))
        } catch (error) {
            console.log("ERROR EN SETSECTIONS")
            console.log(error)
        }
    }
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
    const onUpdateSection = (value: Update) => {
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
        }

        if (value.sectionName !== undefined) {
            updatedSection.name = value.sectionName;
        }

        // if (value.file !== undefined) {
        //     updatedSection.bathimetry = { path: value.file.path, level: 0, name: value.file.name };
        // }

        if (value.level !== undefined) {
            const intersectionPoints = section.bathimetry.line ? getIntersectionPoints(section.bathimetry.line, value.level) : []

            const bathWidth = intersectionPoints[1].x - intersectionPoints[0].x 
            
            dispatch(setBathimetry({...section.bathimetry, level: value.level, width: bathWidth, x1Intersection: intersectionPoints[0].x}))
            
            onUpdateSectionPoints(updatedSection.dirPoints, updatedSection.pixelSize.rw_length, bathWidth, updatedSection.bathimetry.leftBank)
            
            return 
        }

        if (value.leftBank !== undefined) {
            dispatch(setBathimetry({...section.bathimetry, leftBank: value.leftBank}))
            
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
            pixelSize: {size: 0, rw_length: 0},
            rwPoints: DEFAULT_POINTS,
            extraFields: false,
            numStations: DEFAULT_NUM_STATIONS,
            alpha: DEFAULT_ALPHA,
            interpolated: true,
        }
        dispatch(addSection(section))
    }

    /**
     * Function to delete the active section.
     * The active section is deleted from the sections slice.
     */

    const onDeleteSection = () => {
        dispatch(deleteSection())
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
            const { check } = data
            const updatedCheck = [...check];
            updatedCheck[object.rowIndex] = !check[object.rowIndex];
            
            dispatch(changeSectionData({...data, check: updatedCheck}));
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

    const onGetBathimetry = async () => {
        const ipcRenderer = window.ipcRenderer;

        try {
            const data = await ipcRenderer.invoke('get-bathimetry', { path: undefined } )
            const { path, line, name } = data

            if ( data.path !== "" && data.path !== sections[activeSection].bathimetry.path){

                const bathValues = getBathimetryValues(line)

                dispatch(setBathimetry({path: path, name: name, line: line, ...bathValues}))

                const { dirPoints, pixelSize } = sections[activeSection] 
                onUpdateSectionPoints(dirPoints, pixelSize.rw_length, bathValues.width, bathValues.leftBank)
            }
        } catch (error) {
            console.log(error)
            dispatch(updateSection({...sections[activeSection], bathimetry: {path: "", level: 0, name: ""}, sectionPoints: DEFAULT_POINTS}))
        }
    }

    const onUpdateSectionPoints = ( points: Point[] | [], total_distance?: number, bathWidth?: number, leftBank?: number) => {


        
        if( points.length === 0 ){
            dispatch(setSectionPoints(DEFAULT_POINTS))
            return
        }

        if ( !bathWidth || !total_distance) return


        const directionVector = getDirectionVector(points, total_distance)

        const offset = leftBank ? - leftBank : 0


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

        dispatch(setSectionPoints(sectionPoints))
        
    }

    return {    
        sections,
        activeSection,


        onSetDirPoints,
        onAddSection,
        onDeleteSection,
        onSetActiveSection,
        onSetPixelSize,
        onSetSections,
        onSetRealWorld,
        onUpdateSection,
        onSetExtraFields,
        onChangeDataValues,
        onGetBathimetry
    };
};