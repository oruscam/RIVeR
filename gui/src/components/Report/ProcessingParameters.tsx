import { useDataSlice } from "../../hooks"

export const ProcessingParameters = () => {
    const { processing } = useDataSlice()
    const { artificialSeeding, clahe, clipLimit, grayscale, removeBackground,step1, stdFiltering, stdThreshold, medianTestEpsilon, medianTestFiltering, medianTestThreshold } = processing.form

  return (
    <>
        <h2 className="report-title-field mt-3"> Processing Parameters </h2>
        <div id="report-processing-parameters-container">
        <div>
            <h2>Pre-Processing</h2>
            <div>
                <p>Grayscale</p>
                <p> { grayscale ? 'Yes' : 'No'}</p>
            </div>
            <div>
                <p>CLAHE</p>
                <p>{ clahe ? 'Yes' : 'No'}</p>
            </div>
            <div>
                <p>Clip limit</p>
                <p>{ clipLimit }</p>
            </div>
            <div>
                <p>Remove backgraund</p>
                <p>{ removeBackground ? 'Yes' : 'No' }</p>
            </div>
        </div>
        <div>
            <h2>Processing</h2>
            <div>
                <p> Artificial seeding</p>
                <p> { artificialSeeding ? 'Yes' : 'No'}</p>
            </div>
            <div>
                <p> Windows size</p>
                <p> { step1 + '|' + step1/2 }</p>
            </div>
        </div>
        <div>
            <h2>Post-Processing</h2>
            <div>
                <p>Std filtering</p>
                <p> { stdFiltering ? 'Yes' : 'No' } </p>
            </div>
            { 
                stdFiltering && 
                    (<div className="report-processing-parameters-subfield">
                            <p> Threshold</p>
                            <p> { stdThreshold } </p>
                    </div>)
            }
            <div>
                <p> Median test </p>
                <p> { medianTestFiltering ? 'Yes' : 'No' } </p>
            </div>
            {
                medianTestFiltering && 
                (
                    <div className="report-processing-parameters-subfield">
                        <p> Epsilon </p>
                        <p> { medianTestEpsilon } </p>
                    </div>
                )
            }
                        {
                medianTestFiltering && 
                (
                    <div className="report-processing-parameters-subfield">
                        <p> Threshold</p>
                        <p> { medianTestThreshold } </p>
                    </div>
                )
            }
        </div>
    </div>
    </>
  )
}
