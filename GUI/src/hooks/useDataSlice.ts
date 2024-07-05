import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { setVideoParameters, setVideoData, setSectionPoints, setDrawLine, addSection, deleteSection, changeNameSection, setActiveSection, setProjectDirectory, setBathimetryFile, setBathimetryLevel, setPixelSize, setFirstFramePath, setVideoType, setSectionRealWorld } from '../store/data/dataSlice';
import { setLoading } from '../store/ui/uiSlice';
import { FieldValues } from 'react-hook-form';
import { convertInputData } from '../helpers/convertInputData';


export const useDataSlice = () => {
    const { points, video, sections, activeSection, projectDirectory } = useSelector((state: RootState) => state.data);
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

    const onSetPoints = async (points: Point[], factorX: number, factorY: number) => {
        console.log(sections[activeSection].points)
        console.log(video.type)

        if( activeSection !== 0){
            const result = await window.ipcRenderer.invoke('pixel-to-real-world', {points: points[0]})
            console.log(result)
        }
        const newPoints = points.map(point => {
            return {
                x: parseFloat((point.x * factorX).toFixed(2)),
                y: parseFloat((point.y * factorY).toFixed(2))
            };
        });
        dispatch(setSectionPoints(newPoints));
    }


    const onSetPixelSize = async (data: FieldValues) => {
        dispatch(setLoading(true))
        const { pixel_size_LINE_LENGTH: lineLength, pixel_size_PIXEL_SIZE: pixelSize, pixel_size_EAST_point_1: east1, pixel_size_EAST_point_2: east2, pixel_size_NORTH_point_1: north1, pixel_size_NORTH_point_2: north2} = data
        
        const { points } = sections[0]
        const pixelPoints = [points[0].x, points[0].y, points[1].x, points[1].y]
        const rwPoints = [parseFloat(east1), parseFloat(north1), parseFloat(east2), parseFloat(north2)]

        const args = {
            pixelPoints: pixelPoints,
            rwPoints: rwPoints,
            pixelSize: pixelSize,
            rw_length: lineLength,
        }
        const ipcRenderer = window.ipcRenderer;

        try {
            const result = await ipcRenderer.invoke('pixel-size', args)
            console.log(result)
            dispatch(setLoading(false))
            dispatch(setPixelSize({ size: pixelSize, rw_lenght: lineLength}))
            dispatch(setSectionRealWorld([{x: east1, y: north1}, {x: east2, y: north2}]))
            dispatch(setActiveSection(activeSection + 1))

        } catch (error) {
            console.log("ERROR EN SETPIXELSIZE")
                console.log(error)
        }
    }

    const onSetDrawLine = () => {
        // SI EL DRAW LINE PASA DE TRUE A FALSE, LIMPIO LOS PUNTOS DE LA SECCION.
        if(sections[activeSection].drawLine){
            dispatch(setSectionPoints([]))
        }
         
        dispatch(setDrawLine())
    }
    
    
    const onAddSection = (sectionNumber: number) => {
        let str = `CS_default_${sectionNumber}`
        const section = {
            name: str,
            drawLine: false,
            points: [],
            click: false,
            bathimetry: {
                blob: "",
                path: "",
                level: 0
            },
            pixelSize: false,
            realWorld: []
        }
        dispatch(addSection(section))
    }

    const onDeleteSection = () => {
        dispatch(deleteSection())
    }

    const onChangeNameSection = (name: string) => {
        dispatch(changeNameSection(name))
    }

    const onSetActiveSection = (index: number) => {
        dispatch(setActiveSection(index))
    }


    const onSetBathimetryFile = ( file: File | '' ) => {
        if (file === '') return 
        const blob = URL.createObjectURL(file)
        dispatch(setBathimetryFile({blob: blob, path: file.path}))
    }

    const onSetBathimetryLevel = (level: number) => {
        dispatch(setBathimetryLevel(level))
    }

    const onSetSections = async (formData: FieldValues) => {
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

                // dispatch(setLoading(false))
                if(data.pixel_size){
                    const { x1, y1, x2, y2} = data.pixel_size
                    dispatch(setSectionPoints([{x: x1, y: y1}, {x: x2, y: y2}]))
                    dispatch(setDrawLine())
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
        points,
        video,
        sections,
        activeSection,
        projectDirectory,


        onInitProject,
        onSetVideoParameters,
        onSetPoints,
        onSetDrawLine,
        onAddSection,
        onDeleteSection,
        onChangeNameSection,
        onSetActiveSection,
        onSetPixelSize,
        onSetBathimetryFile,
        onSetBathimetryLevel,
        onSetSections,
        onLoadProject
    };
};


