import { useState } from "react"
import { Carousel, Error, ImageWithData, WizardButtons } from "../components"
import { useDataSlice, useUiSlice } from "../hooks"
import { FormHeader } from "../components/Forms/Components"
import { useTranslation } from "react-i18next"
import { useWizard } from "react-use-wizard"
import { FormUnified } from "../components/Forms"
import { ButtonLock } from "../components/ButtonLock"
import { ImageWithDataNew } from "../components/ImageWithDataNew"

// TODO: Change name
export const Unified = () => {
    const { t } = useTranslation()
    const { nextStep } = useWizard()
    const { onSetErrorMessage, onSetSeeAll } = useUiSlice()
    const { images, quiver, isBackendWorking, onSetActiveImage, onGetResultData } = useDataSlice()
    const [showMedian, setShowMedian] = useState(false)
    const [extraFields, setExtraFields] = useState(false);

    const { paths, active } = images

    const handleNext = async () => {
        nextStep();

        // TODO: manejar esto, el test entra como quiver y se puede avanzar, pero no tiene sentido
        try {
            await onGetResultData('all');
                onSetSeeAll(false);
                nextStep();
        } catch (error) {
            onSetErrorMessage((error as Error).message);
        }
    };

    return (
        <div className="regular-page">
            <div className="media-container">
                {/* <ImageWithData showMedian={showMedian} /> */}
                <ImageWithDataNew showMedian={showMedian} />    
                <Carousel
                    images={paths}
                    active={active}
                    setActiveImage={onSetActiveImage}
                    showMedian={showMedian && quiver?.test === false}
                    setShowMedian={setShowMedian}
                    mode="analize"
                />
                <Error/>
            </div>
            <div className="form-container">
                <FormHeader title={t('Processing.title')} showSections={false}/>
                <FormUnified extraFields={extraFields} setShowMedian={setShowMedian} showMedian={showMedian}/>
                <div className="footer">
                    <ButtonLock
                    setLocalExtraFields={setExtraFields}
                    localExtraFields={extraFields}
                    footerElementID="processing-footer"
                    headerElementID="processing-header"
                    disabled={isBackendWorking}
                    />
                    <WizardButtons onClickNext={handleNext} canFollow={quiver !== null && quiver.test === false}/>
                </div>
            </div>
        </div>
    )
}