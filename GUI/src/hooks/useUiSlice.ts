import { useDispatch, useSelector } from "react-redux";
import { changeTheme, uploadFile, setErrorMessage, clearErrorMessage, setLoading, setActiveSection, addSection, deleteSection, changeNameSection, setDrawLine, setPoints, setSeeAll, setScreen, setBathimetry, setVideoFrame, setVideoForm} from "../store/ui/uiSlice";
import { RootState } from "../store/store";
import { Point, ScreenSizes } from '../store/ui/types'

export const useUiSlice = () => {
    const { darkMode, video, error, isLoading, activeSection, sections, seeAll, screenSizes, videoForm} = useSelector((state: RootState) => state.ui);
    const dispatch = useDispatch();

    const onChangeTheme = () => {
        dispatch(changeTheme());
    };

    const onUploadFile = async (video: File) => {
        dispatch(setLoading(true));
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
            dispatch(uploadFile(videoData));
            dispatch(setLoading(false));

            return true;
        }).catch((error) => {
            console.log("Error en onUploadFile");
            console.log(error);

            return false;
        });
        return result;
    };

    const onSetErrorMessage = (error: Record<string, { type: string, message: string }>) => {
        let arrayOfErrors: string[] = [];
        Object.entries(error).every(([, value]) => {
            if (value.type === 'required') {
                arrayOfErrors = [value.message];
                return false;
            } else {
                arrayOfErrors.push(value.message);
            }
        });
        console.log(arrayOfErrors);
        dispatch(setErrorMessage(arrayOfErrors));
        setTimeout(() => {
            dispatch(clearErrorMessage());
        }, 4000);
    };

    const onAddSection = () => {
        let str = `CS_default-${sections.length}`
        sections.map((section) => {
            if(section.name === str){
                str = `CS_default-${sections.length}`
            }
        })
        const section = {
            name: str,
            drawLine: false,
            points: [],
            click: false,
            bathimetry: {
                bathimetryFile: false,
                level: 0
            },
        }
        dispatch(addSection(section));
        dispatch(setActiveSection(sections.length));
    }

    const onDeleteSection = () => {
        const newActive = activeSection - 1
        dispatch(deleteSection(activeSection));
        dispatch(setActiveSection(newActive));
    }

    const onChangeNameSection = ( name: string) => {
        dispatch(changeNameSection(name))
    }

    const onSetActiveSection = ( index: number) => {
        dispatch(setActiveSection(index));
    }

    const onSetDrawLine = () => {
        dispatch(setDrawLine());
    }
    
    // ! Debo escalar los puntos a sus coordenadas en tamaño real de la imagen.
    const onSetPoints = (points: Point[]) => {
        dispatch(setPoints(points))
    }

    const onSetSeeAll = () => {
        dispatch(setSeeAll());
    }

    const onSetScreen = (screen: ScreenSizes) => {
        dispatch(setScreen(screen))
    }

    const onSetBathimetry = ( file: File | false, level: number) => {
        if(!file){
            return dispatch(setBathimetry({
                bathimetryFile: false,
                level: 0
            }))
        }
        const blob = URL.createObjectURL(file)
        dispatch(setBathimetry({
            bathimetryFile: blob,
            level: level
        }))
    }

    const onSetVideoForm = async ( data: any) => {
        dispatch(setLoading(true))
        let parameters = {}
        if (video !== null){
            parameters = {
                video_path: video.path,
                start_frame: Math.floor(parseFloat(data.start) * video.fps).toString(),
                end_frame: Math.floor(parseFloat(data.end) * video.fps).toString(),
                step : data.step.toString()
            }
        }
        dispatch(setVideoForm(data))


        const ipcRenderer = window.ipcRenderer;
        await ipcRenderer.invoke('first-frame', parameters)
        
        ipcRenderer.on('first-frame-output', (_event, message) => {            
            try {
                const messageObj = JSON.parse(message);
                dispatch(setVideoFrame('/@fs' + messageObj.initial_frame))
                dispatch(setLoading(false))
            } catch (error) {
                console.error("Error parsing message JSON:", error);
            }
        })
    }


    return {
        // ATRIBUTES
        darkMode,
        video,
        error,
        isLoading,
        activeSection,
        sections,
        seeAll,
        screenSizes,
        videoForm,

        // METHODS
        onChangeTheme,
        onUploadFile,
        onSetErrorMessage,
        onSetActiveSection,
        onAddSection,
        onDeleteSection,
        onChangeNameSection,
        onSetDrawLine,
        onSetPoints,
        onSetSeeAll,
        onSetScreen,
        onSetBathimetry,
        onSetVideoForm
    };
};
