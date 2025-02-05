import { useWizard } from "react-use-wizard"
import { FormRectification3D } from "../components/Forms/FormRectification3D.tsx"
import { Carousel, Error, ImageRectification3D, Progress, WizardButtons } from "../components/index"
import { useMatrixSlice } from "../hooks/useMatrixSlice.ts"
import { useSectionSlice } from "../hooks/useSectionSlice.ts"

export const Rectification3D = () => {
    const { ipcam, onChangeActiveImage } = useMatrixSlice()
    const { importedImages, activeImage } = ipcam
    const { nextStep } = useWizard()
    const { onSetActiveSection } = useSectionSlice()

    const handleOnClickNext = () => {
        nextStep()
        onSetActiveSection(1)

    }

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
                <WizardButtons canFollow={ipcam.cameraSolution !== undefined} onClickNext={
                    handleOnClickNext
                }/>
            </div>
        </div>
    )
}