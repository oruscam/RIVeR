import { WHITE } from "../../constants/constants";
import { useProjectSlice, useSectionSlice } from "../../hooks"
import { Bathimetry, DischargeSmall, VelocitySmall, VelocityAndDischarge, VelocityVector } from "../Graphs";

export const ReportSection = () => {
  const { sections } = useSectionSlice();
  const { firstFramePath } = useProjectSlice();
  const index = 1

  const { name, data } = sections[index]

  if(!data) return null

  const { total_Q, total_q_std, measured_Q, interpolated_Q, alpha, num_stations } = data


  return (
    <div id="report-section-container">
      {/* <div id="report-section-top-container"> */}
        <div id="report-section-left-container">
          <h1> { name } </h1>
          <h3 id="report-section-discharge-label"> Discharge Q: {total_Q}  m&sup3;/s  (&plusmn; {total_q_std.toFixed(2)} m&sup3;/s)</h3>
          <h4 className="mt-1"> { measured_Q }% Measured </h4>
          <h4> { interpolated_Q}% Interpolated </h4>
          <h3 className="mt-2 report-section-title-1"> Alpha: { alpha } </h3>
          <h3 className="mt-1 report-section-title-1"> Number of stations: { num_stations } </h3>

          <div id="report-section-discharge">
              <DischargeSmall width={450} height={180} index={1}></DischargeSmall>
          </div>
          <div id="report-section-velocity">
            <VelocitySmall width={450} height={180} index={1}></VelocitySmall>
          </div>
          <div id="report-section-bath">
            <Bathimetry lineColor={WHITE} showLeftBank={false} width={400} height={180} drawGrid={false}></Bathimetry>
          </div>
          {/* <VelocityVector width={400} height={200} factor={{x: 4, y: 4}}/> */}
        {/* </div> */}
      </div>
      <div id="report-section-right-container">
        <img src={'/@fs' + firstFramePath} id="report-section-img"></img>

        <div id="report-section-table">
          <table>
            <thead>
              <tr>
                <th> # </th>
                <th> 
                  <div>x</div> 
                  <div>m</div>
                </th>
                <th> 
                  <div>d</div> 
                  <div>m</div> 
                </th>
                <th> 
                  <div>A</div> 
                  <div>m&sup2;</div> 
                </th>
                <th>
                  <div>Vs</div> 
                  <div>m/s</div>
                </th>
                <th> 
                  <div>Q</div> 
                  <div>m&sup3;/s</div> 
                </th>
              </tr>
            </thead>
            <tbody>
              { data.id.map((row, index) => (
                <tr key={index}>
                  <td>{row}</td>
                  <td>{data.distance[index] != null ? data.distance[index].toFixed(2) : '-'}</td>
                  <td>{data.depth[index] != null ? data.depth[index].toFixed(2) : '-'}</td>
                  <td>{data.A[index] != null ? data.A[index].toFixed(2) : '-'}</td>
                  <td>{data.streamwise_magnitude[index] != null ? data.streamwise_magnitude[index].toFixed(2) : '-'}</td>
                  <td>{data.Q[index] != null ? data.Q[index].toFixed(2) : '-'}</td>
                </tr>
              ))}
              
              
            </tbody>
          </table>
      </div>
          
      </div>
      {/* <div id="report-section-bottom-container"></div> */}

    </div>
  )
} 