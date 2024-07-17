import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { setVideoParameters, setVideoData, setSectionPoints, addSection, deleteSection, setActiveSection, setProjectDirectory,   setPixelSize, setFirstFramePath, setVideoType, setSectionRealWorld, updateSection, updateProcessing } from '../store/data/dataSlice';
import { setLoading } from '../store/ui/uiSlice';
import { FieldValues } from 'react-hook-form';
import { convertInputData } from '../helpers/convertInputData';
import { computePixelSize } from '../helpers';


export const useDataSlice = () => {
    const { video, sections, activeSection, projectDirectory, processing } = useSelector((state: RootState) => state.data);
    const dispatch = useDispatch();

    const onInitProject = async (video: File, type: string) => {
        console.log("onInitProject")
        dispatch(setLoading(true))
        const blob = URL.createObjectURL(video);
        const ipcRenderer = window.ipcRenderer;

        try {
            const result = await ipcRenderer.invoke('init-project', {path: video.path, name: video.name, type: type})
            const videoData = {
                name: video.name,
                path: video.path,
                width: result.width,
                height: result.height,
                fps: result.fps,
                blob: blob,
                duration: result.duration,
            };
            
            dispatch(setVideoData(videoData));
            dispatch(setProjectDirectory(result.directory));
            dispatch(setVideoType(type));


            dispatch(setLoading(false));
        } catch (error) {
            console.log("Error en setVideoData (video-metadata)");
            dispatch(setLoading(false));
            throw error
        }
    }


    const onSetVideoParameters = async (data: FieldValues) => {
        dispatch(setLoading(true))
        const parameters = {
            step: data.step,
            startTime: data.start,
            endTime: data.end,
            startFrame: Math.floor(parseFloat(data.start) * video.data.fps).toString(),
            endFrame: Math.floor(parseFloat(data.end) * video.data.fps).toString(),
        }

        const ipcRenderer = window.ipcRenderer;
        try {
            const result = await ipcRenderer.invoke('first-frame', {
                start_frame: parameters.startFrame,
                end_frame: parameters.endFrame,
                step: parameters.step,
            })
            
            dispatch(setVideoParameters(parameters))
            dispatch(setFirstFramePath(result.initial_frame))
            dispatch(setLoading(false))

        } catch (error) {
            console.log(error)
        }        
    }

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

    const onSetPoints = async ( canvasPoint: CanvasPoint | null, formPoint: FormPoint | null  ) => {
        console.log("ON SET POINTS")
        const { realWorld, points } = sections[activeSection];
        
        // Las banderas las utilizo para no hacer calculos que ya estan hechos. 
        // Identifico que punto se esta modificando y solo hago el calculo para el punto en cuestion.

        let flag1 = false;
        let flag2 = false
        
        let newPoints; 
        
        if(canvasPoint){
            const { points: canvasPoints, factor, index } = canvasPoint;
            if( index === null){
                flag1 = true,
                flag2 = true
            } else if ( index === 0){
                flag1 = true
            } else { flag2 = true }
            newPoints = canvasPoints.map((point) => {
                return {
                    x: parseFloat((point.x * factor.x).toFixed(1)),
                    y: parseFloat((point.y * factor.y).toFixed(1))
                }
            })
        }
       
        if(formPoint){
            const {point, position} = formPoint;
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
        dispatch(setSectionPoints(newPoints as Point[]))

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
                
                const { size, rw_lenght}  = computePixelSize(newPoints as Point[], rwCalculated)
                dispatch(setPixelSize({size, rw_lenght}))

            } catch (error) {
                console.log("Error calculando real-world-coordinates")
            }
            } else {
                const {size, rw_lenght} = computePixelSize(newPoints as Point[], realWorld)
                dispatch(setPixelSize({size, rw_lenght}))
            }    
    }

    const onSetRealWorld = async (point: string | number, position: string) => {
        const { realWorld, points } = sections[activeSection];
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
        dispatch(setSectionRealWorld(newPoints))
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
                const { size, rw_lenght}  = computePixelSize(pixelCalulated, newPoints)
                dispatch(setPixelSize({size, rw_lenght}))
                dispatch(setSectionPoints(pixelCalulated))
            } catch (error) {
                console.log("Error calculando pixel-coordinates")
            }
        } else{ 
            const {size, rw_lenght} = computePixelSize(points, newPoints)
            dispatch(setPixelSize({size, rw_lenght}))
        }

        
    };

    const onSetPixelSize = async (_data: FieldValues) => {
        dispatch(setLoading(true))
        
        const { points: pixelPoints, realWorld: realWorldPoints, pixelSize } = sections[0]

        const args = {
            pixelPoints: pixelPoints,
            rwPoints: realWorldPoints,
            pixelSize: pixelSize.size,
            rw_length: pixelSize.rw_lenght,
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


    const onSetActiveSection = (index: number) => {
        dispatch(setActiveSection(index))
    }

    // * ON UPDTATE SECTION 


    const onSetBathimetryFile = ( file: File | '' ) => {
        if (file === '') return 
        const blob = URL.createObjectURL(file)
        dispatch(setBathimetryFile({blob: blob, path: file.path}))
    }

    // * ON UPDTATE SECTION 

    const onSetBathimetryLevel = (level: number) => {
        dispatch(setBathimetryLevel(level))
    }

    const onSetSections = async (formData: FieldValues) => {
        console.log(formData)
        const csNames: string[] = []
        sections.map((section, index) => {
            if(index > 0){
                csNames.push(section.name)
            }
        })
        const data = convertInputData(formData, csNames)
        const ipcRenderer = window.ipcRenderer;
        try {
            const result = await ipcRenderer.invoke('set-sections', {projectDirectory, data})
            console.log(result)
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

    const onUpdateSection = ( value: Update ) => {
        console.log("onUpdateSection")
        const section = sections[activeSection]
        if( value.drawLine ){
            dispatch(updateSection({...section, drawLine: !section.drawLine, points: []}))
        }
        if( value.lineLength ){
            const { points } = section
            const resetRealWorld = [{x: 0, y: 0}, {x: value.lineLength, y: 0}]
            const { size, rw_lenght } = computePixelSize(points, resetRealWorld)
            dispatch(setPixelSize({size, rw_lenght}))
            dispatch(setSectionRealWorld(resetRealWorld))
        }
        if( value.sectionName ){
            dispatch(updateSection({...section, name: value.sectionName }))
        }
        if( value.file ){
            console.log("value.file", value.file)
            const blob = URL.createObjectURL(value.file)
            dispatch(updateSection({...section, bathimetry: {blob: blob, path: value.file.path, level: 0, name: value.file.name,}}))
        }
        if( value.level ){
            dispatch(updateSection({...section, bathimetry: {...section.bathimetry, level: value.level}}))
        }
    }

    const onAddSection = (sectionNumber: number) => {
        let str = `CS_default_${sectionNumber}`
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
            pixelSize: {size: 0, rw_lenght: 0},
            realWorld: [{x: 0, y: 0}, {x: 0, y: 0}]
        }
        dispatch(addSection(section))
    }

    const onDeleteSection = () => {
        dispatch(deleteSection())
    }


    // const onSetProcessingImages = (images: string[]) => {
    //     dispatch(setProcessingImages(images))
    // }

    interface Processing {
        images?: string[];
        step1?: number;
    }

    const onUpdateProccesing = ( value: Processing) => {
        if( value.images){
            dispatch(updateProcessing({...processing, par: value.images}))
        }
        if(value.step1){
            console.log("OMD")
            dispatch(updateProcessing({...processing, step1: value.step1}))
        }
    }



    // * v0.0.1

    const onLoadProject = async () => {
        console.log("onLoadProject")
        console.log(sections)
        dispatch(setLoading(true))
        const ipcRenderer = window.ipcRenderer;
        try {
            const result = await ipcRenderer.invoke('load-project')
            
            if( result.success ){
                console.log(result.message)
                const { data, projectDirectory, videoMetadata, firstFrame } = result.message 
                
                dispatch(setProjectDirectory(projectDirectory))
                dispatch(setVideoType(data.type))
                dispatch(setVideoData({
                    width: videoMetadata.width,
                    height: videoMetadata.height,
                    fps: videoMetadata.fps,
                    path: data.filepath,
                    duration: videoMetadata.duration,
                    name: null,
                    blob: null
                }))
                if(firstFrame !== ''){
                    dispatch(setFirstFramePath(firstFrame))
                }

                dispatch(setLoading(false))
                if(data.pixel_size){
                    const { x1, y1, x2, y2} = data.pixel_size
                    dispatch(setSectionPoints([{x: x1, y: y1}, {x: x2, y: y2}]))
                    // dispatch(setDrawLine())
                    return 4
                } else if(data.video_range){
                    const { step, start, end } = data.video_range
                    dispatch(setVideoParameters({
                        step: step,
                        startFrame: start,
                        endFrame: end,
                        startTime: null,
                        endTime: null
                    }))
                    return 3
                } else {
                    return 2
                }

            } else{
                console.log(result.message)
                dispatch(setLoading(false))
                return result.message
            }

        } catch (error) {
            console.log("Error EN onLoadProject")
            console.log(error)
            
        }
    }


    return {    
        video,
        sections,
        activeSection,
        projectDirectory,
        processing,


        onInitProject,
        onSetVideoParameters,
        onSetPoints,
        onAddSection,
        onDeleteSection,
        onSetActiveSection,
        onSetPixelSize,
        onSetBathimetryFile,
        onSetBathimetryLevel,
        onSetSections,
        onLoadProject,
        onSetRealWorld,
        onUpdateSection,
        onUpdateProccesing
    };
};


