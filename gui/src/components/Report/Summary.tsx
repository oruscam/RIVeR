import { getUnit } from "../../helpers"
import { useProjectSlice, useSectionSlice } from "../../hooks"

export const Summary = () => {
    const { sections } = useSectionSlice()
    const { projectDetails } = useProjectSlice()
    const { unitSistem } = projectDetails


  return (
    <>
        <h2 className="report-title-field mt-4" id="summary-title"> Summary </h2>
        <div id='report-section-summary-container'>
            <table>
                <thead>
                    <tr>
                        <th> Cross Sections </th>
                        <th>
                            <div>Width</div>
                            <div>{getUnit(unitSistem, 'distance')} </div>
                        </th>
                        <th>
                            <div> Area </div>
                            <div> {getUnit(unitSistem, 'area')} </div>
                        </th>
                        <th>
                            <div> Q </div>
                            <div> {getUnit(unitSistem, 'Q')} </div>
                        </th>
                        <th>
                            <div> Mean V </div>
                            <div> {getUnit(unitSistem, 'mean-v')} </div>
                        </th>
                        <th>
                            <div> Alpha </div>
                            <div> - </div>
                        </th>
                        <th>
                            <div> Average Vs </div>
                            <div> {getUnit(unitSistem, 'average-vs')} </div>
                        </th>
                        <th>
                            <div> Max d </div>
                            <div> {getUnit(unitSistem, 'max-d')} </div>
                        </th>
                        <th>
                            <div> Mean d </div>
                            <div> {getUnit(unitSistem, 'mean-d')} </div>
                        </th>
                        <th>
                            <div> % measured</div>
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
                                    <td> {pixelSize.rw_length} </td>
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
                        <td> Mean </td>
                        <td> 1 </td>
                        <td> 1 </td>
                        <td> 1 </td>
                        <td> 1 </td>
                        <td> 1 </td>
                        <td> 1 </td>
                        <td> 1 </td>
                        <td> 1 </td>
                        <td> 1 </td>
                    </tr>
                    <tr style={{height: '30px'}}>
                        <td> Std dev </td>
                        <td> 1 </td>
                        <td> 1 </td>
                        <td> 1 </td>
                        <td> 1 </td>
                        <td> 1 </td>
                        <td> 1 </td>
                        <td> 1 </td>
                        <td> 1 </td>
                        <td> 1 </td>
                    </tr>
                    <tr style={{height: '30px'}}>
                        <td> COV </td>
                        <td> 1 </td>
                        <td> 1 </td>
                        <td> 1 </td>
                        <td> 1 </td>
                        <td> 1 </td>
                        <td> 1 </td>
                        <td> 1 </td>
                        <td> 1 </td>
                        <td> 1 </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </>
  )
}