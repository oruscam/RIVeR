import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../store/store";
import { updateProcessingPar, setActiveImage, updateProcessingForm, setProcessingTest, setQuiver } from "../store/data/dataSlice";
import { Quiver } from "../store/data/types";
import { setLoading } from "../store/ui/uiSlice";

export const useDataSlice = () => {
    const dispatch = useDispatch();
    const { processing, images, quiver } = useSelector((state: RootState) => state.data);

    interface ProcessingValues {
        images?: string[];
        step1?: number;
    }

    const onUpdateProccesing = (value: ProcessingValues) => {
        if (value.images) {
            dispatch(updateProcessingPar(value.images));
        }
        if (value.step1) {
            dispatch(updateProcessingForm({ ...processing.form, step1: value.step1 }));
        }
    }

    const onSetActiveImage = (value: number) => {
        dispatch(setActiveImage(value))
    }

    const onSetQuiverTest = async () => {
        dispatch(setProcessingTest(true))
        const ipcRenderer = window.ipcRenderer;

        try {
            const data: Quiver = await ipcRenderer.invoke('get-quiver-test')

            dispatch(setQuiver(data))
            dispatch(setProcessingTest(false))
        } catch (error) {
            console.log(error)
        }
    }

    const onSetQuiverAll = async () => {
        dispatch(setLoading(true))
        const ipcRenderer = window.ipcRenderer;

        try {
            const data: Quiver = await ipcRenderer.invoke('get-quiver-all')
            
            if( quiver?.x ){
                dispatch(setQuiver({
                    ...quiver, u: data.u, v: data.v
                }))
            } else {
                dispatch(setQuiver(data))
            }
            dispatch(setLoading(false))
        } catch (error) {
            console.log(error)
        }
    }


    return {
        // ATRIBUTES
        images,
        processing,
        quiver,
        // METHODS
        onSetActiveImage,
        onSetQuiverTest,
        onUpdateProccesing,
        onSetQuiverAll
    }
}