import { FormRectification3D } from "../components/Forms/FormRectification3D.tsx"
import { Carousel, Error, ImageRectification3D, Progress, WizardButtons } from "../components/index"
import { useMatrixSlice } from "../hooks/useMatrixSlice.ts"

export const Rectification3D = () => {
    const { ipcam, onChangeActiveImage } = useMatrixSlice()
    const { importedImages, activeImage } = ipcam

    return (
        <div className="regular-page">
            <div className="media-container">
                <ImageRectification3D/>
                { importedImages !== undefined && <Carousel images={importedImages} active={activeImage!} setActiveImage={onChangeActiveImage} mode="ipcam"/>} 
                <Error/>
            </div>
            <div className="form-container">
                <Progress/>
                <FormRectification3D/>
                <WizardButtons/>
            </div>
        </div>
    )
}