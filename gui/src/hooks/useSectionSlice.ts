/**
 * @file useSectionSlice.ts
 * @description This file contains the custom hook to interact with the section slice.
 */

import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { setSectionPoints, addSection, deleteSection, setActiveSection, setPixelSize, setSectionRealWorld, updateSection, updateProcessing } from '../store/section/sectionSlice';
import { setLoading } from '../store/ui/uiSlice';
import { FieldValues } from 'react-hook-form';
import { convertInputData } from '../helpers/convertInputData';
import { computePixelSize } from '../helpers';
import { setImages, setProcessingMask, updateProcessingForm } from '../store/data/dataSlice';

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

    interface Point {
        x: number;
        y: number;
    }

    interface CanvasPoint {
        points: Point[];
        factor: {x: number, y: number};
        index: number | null
    }

    interface FormPoint {
        point: string | number;
        position: string;
    }

    /**
     * 
     * @param canvasPoint | null - Object with the points in pixels and the factor to convert to real world coordinates.
     * @param formPoint | null - Object with the real world coordinates and the position to update. This can be passed in formPixelSize or formCrossSections, by the child component pixelCoordinates.
     */
    const onSetPoints = async ( canvasPoint: CanvasPoint | null, formPoint: FormPoint | null  ) => {
        const { realWorld, points } = sections[activeSection];

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
                    x: parseFloat((point.x * factor.x).toFixed(1)),
                    y: parseFloat((point.y * factor.y).toFixed(1))
                }
            })
        }
        
        /**
         * If formPoint is not null, the real world coordinates are being modified by the user in the form.
         * The newPoints variable is calculated by updating the point in the position specified in the formPoint object.
         */

        if(formPoint){
            const { point, position } = formPoint;
            if ( position === 'x1' && point !== points[0].x){
                newPoints = [{x: parseFloat(point as string), y: points[0].y}, {x: points[1].x, y: points[1].y}]
                flag1 = true
            } else if ( position === 'y1' && point !== points[0].y){
                newPoints = [{x: points[0].x, y: parseFloat(point as string)}, {x: points[1].x, y: points[1].y}]
                flag1 = true
            } else if ( position === 'x2' && point !== points[1].x){
                newPoints = [{x: points[0].x, y: points[0].y}, {x: parseFloat(point as string), y: points[1].y}]
                flag2 = true
            } else if ( position === 'y2' && point !== points[1].y){
                newPoints = [{x: points[0].x, y: points[0].y}, {x: points[1].x, y: parseFloat(point as string)}]
                flag2 = true
            } else {
                newPoints = points
            }
        }

        /**
         * The new points are stored in the section slice, if the points are different from the current points.
         */
        if(newPoints){
            if (newPoints[0].x === newPoints[1].x && newPoints[0].y === newPoints[1].y) {
                console.error("Los puntos no pueden ser iguales.");
                newPoints = points; // Revertir a los puntos originales
                flag1 = false;
                flag2 = false;
                dispatch(setSectionPoints(newPoints as Point[]))
            } else {
                dispatch(setSectionPoints(newPoints as Point[]))
            }

        }

        /**
         * If the active section is greater than 0, the real world coordinates are calculated.
         * The real world coordinates are calculated by converting the pixel points to real world coordinates.
         * The real world coordinates are stored in the section slice.
         * The pixel size is calculated by the difference between the real world coordinates.
         * The pixel size is stored in the section slice.
         */

        if( activeSection >= 1){
            let rwCalculated: Point[] = [ {x: 0, y: 0}, {x:0, y: 0}]
            
            const ipcRenderer = window.ipcRenderer;
            try {
                if (newPoints && flag1 && flag2) {
                    const {rw_coordinates: par1} = await ipcRenderer.invoke('pixel-to-real-world', { points: {x: newPoints[0].x, y: newPoints[0].y}})
                    const {rw_coordinates: par2} = await ipcRenderer.invoke('pixel-to-real-world', { points: {x: newPoints[1].x, y: newPoints[1].y}})
                    rwCalculated = [{x: par1[0], y: par1[1]}, {x: par2[0], y: par2[1]}]
                    dispatch(setSectionRealWorld(rwCalculated))
                } else if (newPoints && flag1){
                    const {rw_coordinates: par1} = await ipcRenderer.invoke('pixel-to-real-world', { points: {x: newPoints[0].x, y: newPoints[0].y}})
                    rwCalculated = [{x: par1[0], y: par1[1]}, realWorld[1]]
                    dispatch(setSectionRealWorld(rwCalculated))
                } else if (newPoints && flag2){
                    const {rw_coordinates: par2} = await ipcRenderer.invoke('pixel-to-real-world', { points: {x: newPoints[1].x, y: newPoints[1].y}})
                    rwCalculated = [realWorld[0], {x: par2[0], y: par2[1]}]
                    dispatch(setSectionRealWorld(rwCalculated))
                }
                
                const { size, rw_length}  = computePixelSize(newPoints as Point[], rwCalculated)
                dispatch(setPixelSize({size, rw_length}))

            } catch (error) {
                console.log("Error calculando real-world-coordinates")
            }
            } else {
                const {size, rw_length} = computePixelSize(newPoints as Point[], realWorld)
                dispatch(setPixelSize({size, rw_length}))
            }    
    }

    /**
     * Function to update the real world coordinates of the active section.
     * @param point | string | number - The new value of the real world coordinate.
     * @param position | string - The position of the real world coordinate to update.
     */

    const onSetRealWorld = async (point: string | number, position: string) => {
        const { realWorld, points } = sections[activeSection];

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
        if ( position === 'x1' && point !== realWorld[0].x){
            newPoints = [{x: parseFloat(point as string), y: realWorld[0].y}, {x: realWorld[1].x, y: realWorld[1].y}]
            flag1 = true;
        } else if ( position === 'y1' && point !== realWorld[0].y){
            newPoints = [{x: realWorld[0].x, y: parseFloat(point as string)}, {x: realWorld[1].x, y: realWorld[1].y}]
            flag1 = true;
        } else if ( position === 'x2' && point !== realWorld[1].x){
            newPoints = [{x: realWorld[0].x, y: realWorld[0].y}, {x: parseFloat(point as string), y: realWorld[1].y}]
            flag2 = true;
        } else if ( position === 'y2' && point !== realWorld[1].y){
            newPoints = [{x: realWorld[0].x, y: realWorld[0].y}, {x: realWorld[1].x, y: parseFloat(point as string)}]
            flag2 = true;
        } else{
            newPoints = realWorld
        }

        /**
         * The new real world coordinates are stored in the section slice.
         */
        if(newPoints){
            if( newPoints[0].x === newPoints[1].x && newPoints[0].y === newPoints[1].y){
                console.error("Los puntos no pueden ser iguales.");
                newPoints = realWorld;
                flag1 = false;
                flag2 = false;
            } else {
                dispatch(setSectionRealWorld(newPoints))
            }
        }

        /**
         * If the active section is greater than 0, the pixel coordinates are calculated.
         * The pixel coordinates are calculated by converting the real world coordinates to pixel coordinates.
         * The pixel coordinates are stored in the section slice.
         * The pixel size is calculated by the difference between the real world coordinates.
         * The pixel size is stored in the section slice.
         */

        if(activeSection >= 1 && newPoints !== realWorld){
            let pixelCalulated: Point[] = [{x: 0, y: 0}, {x: 0, y: 0}]
            const ipcRenderer = window.ipcRenderer;
            try {
                if( flag1 ){
                    const {pix_coordinates} = await ipcRenderer.invoke('real-world-to-pixel', { points: {x: newPoints[0].x, y: newPoints[0].y}})
                    pixelCalulated = [{x: pix_coordinates[0], y: pix_coordinates[1]}, points[1]]
                } else if( flag2 ) {
                    const {pix_coordinates} = await ipcRenderer.invoke('real-world-to-pixel', { points: {x: newPoints[1].x, y: newPoints[1].y}})
                    pixelCalulated = [points[0], {x: pix_coordinates[0], y: pix_coordinates[1]}]
                }
                const { size, rw_length}  = computePixelSize(pixelCalulated, newPoints)
                dispatch(setPixelSize({size, rw_length}))
                dispatch(setSectionPoints(pixelCalulated))
            } catch (error) {
                console.log("Error calculando pixel-coordinates")
            }
        } else{ 
            const {size, rw_length} = computePixelSize(points, newPoints)
            dispatch(setPixelSize({size, rw_length}))
        }
    };

    /**
     * Function to calculate the pixel size of the pixel_size section.
     * @param _data | FieldValues - from useFormHook
     */

    const onSetPixelSize = async (_data: FieldValues) => {
        dispatch(setLoading(true))
        
        const { points: pixelPoints, realWorld: realWorldPoints, pixelSize } = sections[0]
        const args = {
            pixelPoints: pixelPoints,
            rwPoints: realWorldPoints,
            pixelSize: pixelSize.size,
            rw_length: pixelSize.rw_length,
        }

        const ipcRenderer = window.ipcRenderer;
        try {
            const result = await ipcRenderer.invoke('pixel-size', args)
            console.log(result)
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

    const onSetSections = async (formData: FieldValues) => {
        dispatch(setLoading(true))

        /**
         * The cross sections names are stored in the csNames array.
         * The cross sections names are used to convert the input data to the correct format.
         */

        const csNames: string[] = []
        const bahtsPaths: string[] = []
        sections.map((section, index) => {
            if(index > 0){
                csNames.push(section.name)
                bahtsPaths.push(section.bathimetry.path)
            }
        })

        const data = convertInputData(formData, csNames, bahtsPaths)
        const ipcRenderer = window.ipcRenderer;

        /**
         * The sections are stored in the section slice.
         * The height_roi is calculated and stored in the data slice.
         * The mask and the bounding box are created and stored in the data slice.
         * The images are stored in the data slice.
         * The calculation is here because, we have the sections data.
         */

        try {
            await ipcRenderer.invoke('set-sections', {data})
            const { height_roi } = await ipcRenderer.invoke('recommend-roi-height')
            const { maskPath } = await ipcRenderer.invoke('create-mask-and-bbox', { height_roi: height_roi })

            const images = await ipcRenderer.invoke('get-images')
            
            dispatch(setImages(images))
            dispatch(updateProcessingForm({...processing.form, heightRoi: height_roi}))
            dispatch(setProcessingMask(maskPath))
            
            dispatch(setLoading(false))
        } catch (error) {
            console.log("ERROR EN SETSECTIONS")
            console.log(error)
        }
    }

    interface Update {
        lineLength?: number,
        drawLine?: boolean,
        sectionName?: string,
        index?: number,
        file?: File,
        level?:number
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

    const onUpdateSection = ( value: Update ) => {
        const section = sections[activeSection]

        if( value.drawLine ){
            dispatch(updateSection({...section, drawLine: !section.drawLine, points: [], pixelSize: {
                rw_length: 0,
                size: 0
            }}))
        }
        if( value.lineLength ){
            const { points } = section
            const resetRealWorld = [{x: 0, y: 0}, {x: value.lineLength, y: 0}]
            const { size, rw_length } = computePixelSize(points, resetRealWorld)
            dispatch(setPixelSize({size, rw_length}))
            dispatch(setSectionRealWorld(resetRealWorld))
        }
        if( value.sectionName ){
            dispatch(updateSection({...section, name: value.sectionName }))
        }
        if( value.file ){
            console.log(value.file)
            const blob = URL.createObjectURL(value.file)
            dispatch(updateSection({...section, bathimetry: {blob: blob, path: value.file.path, level: 0, name: value.file.name,}}))
        }
        if( value.level ){
            dispatch(updateSection({...section, bathimetry: {...section.bathimetry, level: value.level}}))
        }
    }

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
            points: [],
            bathimetry: {
                blob: "",
                path: "",
                level: 0,
                name: ""
            },
            pixelSize: {size: 0, rw_length: 0},
            realWorld: [{x: 0, y: 0}, {x: 0, y: 0}]
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

    return {    
        sections,
        activeSection,
        processing,


        onSetPoints,
        onAddSection,
        onDeleteSection,
        onSetActiveSection,
        onSetPixelSize,
        onSetSections,
        onSetRealWorld,
        onUpdateSection,
    };
};


