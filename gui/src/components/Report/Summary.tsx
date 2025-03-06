import { useTranslation } from "react-i18next"
import { getUnit } from "../../helpers"
import { useProjectSlice, useSectionSlice } from "../../hooks"

export const Summary = () => {
    const { t } = useTranslation()
    const { sections, summary } = useSectionSlice()
    const { projectDetails } = useProjectSlice()
    const { unitSistem } = projectDetails

    if (summary === undefined) return null

    const { mean, std, cov } = summary

  return (
    <>
        <h2 className="report-title-field mt-4" id="summary-title">  {t('Report.Summary.title')} </h2>
        <div id='report-section-summary-container'>
            <table>
                <thead>
                    <tr>
                        <th> {t('CrossSections.title')} </th>
                        <th>
                            <div> {t('Report.Summary.width')}</div>
                            <div>{getUnit(unitSistem, 'longitude')} </div>
                        </th>
                        <th>
                            <div> {t('Report.Summary.area')} </div>
                            <div> {getUnit(unitSistem, 'area')} </div>
                        </th>
                        <th>
                            <div> {t('Report.Summary.q')} </div>
                            <div> {getUnit(unitSistem, 'flow')} </div>
                        </th>
                        <th>
                            <div> {t('Report.Summary.meanV')} </div>
                            <div> {getUnit(unitSistem, 'velocity')} </div>
                        </th>
                        <th>
                            <div> {t('Report.Summary.alpha')} </div>
                            <div> - </div>
                        </th>
                        <th>
                            <div> {t('Report.Summary.averageVs')} </div>
                            <div> {getUnit(unitSistem, 'velocity')} </div>
                        </th>
                        <th>
                            <div> {t('Report.Summary.maxD')} </div>
                            <div> {getUnit(unitSistem, 'longitude')} </div>
                        </th>
                        <th>
                            <div> {t('Report.Summary.meanD')} </div>
                            <div> {getUnit(unitSistem, 'longitude')} </div>
                        </th>
                        <th>
                            <div> {t('Report.Summary.measured')} </div>
                            <div> - </div>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {
                        sections.map((section, index) => {
                            if (index === 0) return null
                            
                            const { name, data, pixelSize, alpha } = section
                            if(data === undefined) return null
                            const { mean_V, average_depth, max_depth, measured_Q, total_Q } = data
                            return (
                                <tr key={index} className={index === sections.length -1 ? 'summary-last-section' : ''}>
                                    <td> {name} </td>
                                    <td> {pixelSize.rwLength} </td>
                                    <td> 1 </td>
                                    <td> { total_Q } </td>
                                    <td> { mean_V.toFixed(2) }</td>
                                    <td> { alpha } </td>
                                    <td> { average_depth.toFixed(2)} </td>
                                    <td> { max_depth.toFixed(2)} </td>
                                    <td> 1 </td>
                                    <td> {measured_Q}</td>
                                </tr>
                            )

                        })
                    }
                    <tr style={{height: '30px'}}>
                        <td> {t('Report.Summary.mean')} </td>
                        <td> { mean.total_W } </td>
                        <td> { mean.total_A } </td>
                        <td> { mean.total_Q } </td>
                        <td> { mean.mean_V } </td>
                        <td> { mean.alpha } </td>
                        <td> { mean.mean_Vs} </td>
                        <td> { mean.max_depth } </td>
                        <td> { mean.average_depth } </td>
                        <td> { mean.measured_Q} </td>
                    </tr>
                    <tr style={{height: '30px'}}>
                        <td> {t('Report.Summary.stdDev')} </td>
                        <td> { std.total_W } </td>
                        <td> { std.total_A } </td>
                        <td> { std.total_Q } </td>
                        <td> { std.mean_V } </td>
                        <td> { std.alpha } </td>
                        <td> { std.mean_Vs } </td>
                        <td> { std.max_depth } </td>
                        <td> { std.average_depth } </td>
                        <td> { std.measured_Q } </td>
                    </tr>
                    <tr style={{height: '30px'}}>
                        <td> {t('Report.Summary.cov')} </td>
                        <td> { cov.total_W } </td>
                        <td> { cov.total_A } </td>
                        <td> { cov.total_Q } </td>
                        <td> { cov.mean_V } </td>
                        <td> { cov.alpha } </td>
                        <td> { cov.mean_Vs } </td>
                        <td> { cov.max_depth } </td>
                        <td> { cov.average_depth} </td>
                        <td> { cov.measured_Q } </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </>
  )
}