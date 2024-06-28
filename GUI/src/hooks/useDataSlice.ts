import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { setVideoParameters, setVideoData, setSectionsPoints, setDrawLine, addSection, deleteSection, changeNameSection, setActiveSection, setProjectDirectory, setBathimetryFile, setBathimetryLevel } from '../store/data/dataSlice';
import { setLoading } from '../store/ui/uiSlice';
import { FieldValues } from 'react-hook-form';


export const useDataSlice = () => {
    const { points, video, sections, activeSection, projectDirectory } = useSelector((state: RootState) => state.data);
    const dispatch = useDispatch();


    const onSetVideoData = (video: File, type: string) => {
        console.log("onSetVideoData")
        dispatch(setLoading(true))
        const blob = URL.createObjectURL(video);
        const ipcRenderer = window.ipcRenderer;
        const result = ipcRenderer.invoke('video-metadata', {path: video.path, name: video.name, type: type}).then(result => {
        const videoData = {
                name: video.name,
                path: video.path,
                width: result.width,
                height: result.height,
                fps: result.fps,
                blob: blob,
                duration: result.duration,
                firstFrame: false
            };
            dispatch(setVideoData(videoData));
            dispatch(setProjectDirectory(result.directory));
            dispatch(setLoading(false));

            return true;
        }).catch((error) => {
            console.log("Error en setVideoData (uploadFile)");
            console.log(error);

            return false;
        });
        return result;
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
        const args = {
            video_path: video.data.path,
            start_frame: parameters.startFrame,
            end_frame: parameters.endFrame,
            step: parameters.step,
            directory: projectDirectory
        }

        const ipcRenderer = window.ipcRenderer;
        await ipcRenderer.invoke('first-frame', args)
            .then((message) => {
                const messageObj = JSON.parse(message);
                const firstFramePath = '/@fs' + messageObj.initial_frame;
                dispatch(setVideoParameters({ ...parameters, firstFramePath: firstFramePath }))
                dispatch(setLoading(false))
            })
            .catch((error) => {
                console.log(error)
        });
        

    }


    interface Point {
        x: number;
        y: number;
    }

    const onSetPoints = (points: Point[], factorX: number, factorY: number) => {
        const newPoints = points.map(point => {
            return {
                x: parseFloat((point.x * factorX).toFixed(2)),
                y: parseFloat((point.y * factorY).toFixed(2))
            };
        });
        dispatch(setSectionsPoints(newPoints));
    }

    const onSetDrawLine = () => {
        dispatch(setDrawLine())
    }

    const onAddSection = () => {
        let str = `CS_default-${sections.length}`
        sections.map((section) => {
            if (section.name === str) {
                str = `CS_default-${sections.length}`
            }
        })
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
            hardMode: false
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

    const onSetPixelSize = (data: any) => {
        console.log("onSendPixelSize", data)
        dispatch(setActiveSection(activeSection + 1))

    }

    const onSetBathimetryFile = ( file: File | '' ) => {
        if (file === '') return 
        const blob = URL.createObjectURL(file)
        dispatch(setBathimetryFile({blob: blob, path: file.path}))
    }

    const onSetBathimetryLevel = (level: number) => {
        dispatch(setBathimetryLevel(level))
    }

    return {    
        points,
        video,
        sections,
        activeSection,


        onSetVideoData,
        onSetVideoParameters,
        onSetPoints,
        onSetDrawLine,
        onAddSection,
        onDeleteSection,
        onChangeNameSection,
        onSetActiveSection,
        onSetPixelSize,
        onSetBathimetryFile,
        onSetBathimetryLevel
    };
};