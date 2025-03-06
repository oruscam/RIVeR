import { useTranslation } from "react-i18next"
import { useDataSlice } from "../../hooks"

export const ProcessingParameters = () => {
    const { processing } = useDataSlice()
    const { artificialSeeding, clahe, clipLimit, grayscale, removeBackground,step1, stdFiltering, stdThreshold, medianTestEpsilon, medianTestFiltering, medianTestThreshold } = processing.form
    const { t } = useTranslation()

  return (
    <>
        <h2 className="report-title-field mt-3"> {t('Report.processingParameters')} </h2>
        <div id="report-processing-parameters-container">
        <div>
            <h2>{t('Report.preProcessing')}</h2>
            <div>
                <p>{t('Processing.grayscale')}</p>
                <p> { grayscale ? t('Commons.yes') : t('Commons.no')}</p>
            </div>
            <div>
                <p>{t('Processing.clahe')}</p>
                <p>{ clahe ? t('Commons.yes') : t('Commons.no')}</p>
            </div>
            <div>
                <p>{t('Processing.clipLimit')}</p>
                <p>{ clipLimit }</p>
            </div>
            <div>
                <p>{t('Processing.removeBackground')}</p>
                <p>{ removeBackground ? t('Commons.yes') : t('Commons.no') }</p>
            </div>
        </div>
        <div>
            <h2>{t('Processing.title')}</h2>
            {/* <div>
                <p> {t('Processing.artificialSeeding')}</p>
                <p> { artificialSeeding ? t('Commons.yes') : t('Commons.no') }</p>
            </div> */}
            <div>
                <p>{t('Processing.windowSizes')}</p>
                <p> { step1 + '|' + step1/2 }</p>
            </div>
        </div>
        <div>
            <h2>{t('Report.postProcessing')}</h2>
            <div>
                <p>{t('Processing.stdFiltering')}</p>
                <p> { stdFiltering ? t('Commons.yes') : t('Commons.no') } </p>
            </div>
            { 
                stdFiltering && 
                    (<div className="report-processing-parameters-subfield">
                            <p> {t('Processing.threshold')}</p>
                            <p> { stdThreshold } </p>
                    </div>)
            }
            <div>
                <p> {t('Processing.medianTestFiltering')} </p>
                <p> { medianTestFiltering ? t('Commons.yes') : t('Commons.no') } </p>
            </div>
            {
                medianTestFiltering && 
                (
                    <div className="report-processing-parameters-subfield">
                        <p> {t('Processing.epsilon')} </p>
                        <p> { medianTestEpsilon } </p>
                    </div>
                )
            }
                        {
                medianTestFiltering && 
                (
                    <div className="report-processing-parameters-subfield">
                        <p> {t('Processing.threshold')}</p>
                        <p> { medianTestThreshold } </p>
                    </div>
                )
            }
        </div>
    </div>
    </>
  )
}
