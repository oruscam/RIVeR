import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { clearPoints, setPoints, setVideoParameters, setVideoData } from '../store/data/dataSlice';
import { setLoading } from '../store/ui/uiSlice';
import { FieldValues } from 'react-hook-form';

export const useDataSlice = () => {
    const { points, video } = useSelector((state: RootState) => state.data);
    const dispatch = useDispatch();

    const onSetPoints = (points: { x: number; y: number }[], factorX: number, factorY: number, image: string) => {
        const newPoints = points.map(point => {
            return {
                x: point.x * factorX,
                y: point.y * factorY
            };
        });
        dispatch(setPoints(newPoints));
    }

    const onClearPoints = () => {
        dispatch(clearPoints())
    }
    
    const onSetVideoData = (video: File) => {
        console.log("onSetVideoData")
        dispatch(setLoading(true))
        const blob = URL.createObjectURL(video);
        const ipcRenderer = window.ipcRenderer;
        const result = ipcRenderer.invoke('video-metadata', video.path).then(result => {
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
        const commands = {
            video_path: video.data.path,
            start_frame: parameters.startFrame,
            end_frame: parameters.endFrame,
            step: parameters.step
        }
        
        const ipcRenderer = window.ipcRenderer;
        await ipcRenderer.invoke('first-frame', commands)
        .then((message) => {
            const messageObj = JSON.parse(message);
            const firstFramePath = '/@fs' + messageObj.initial_frame;
            dispatch(setVideoParameters({...parameters, firstFramePath: firstFramePath}))
            dispatch(setLoading(false))
        })
        .catch((error) => {
            console.log(error)
        });

        // ipcRenderer.on('first-frame-output', (_event, message) => {            
        //     try {
        //         const messageObj = JSON.parse(message);
        //         const firstFramePath = '/@fs' + messageObj.initial_frame;
        //         dispatch(setVideoParameters({...parameters, firstFramePath: firstFramePath}))
        //         dispatch(setLoading(false))

        //     } catch (error) {
        //         console.error("Error parsing message JSON:", error);
        //     }
        // })
    }

    return { 
        points,
        video,


        onSetVideoData,
        onSetPoints,
        onClearPoints,
        onSetVideoParameters
     };
};