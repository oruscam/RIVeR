import { useProjectSlice, useSectionSlice } from "../../hooks"
import { AllInOne } from "../Graphs";
import { ReportSectionTable } from "./ReportSectionTable";

export const ReportSection = () => {
  const { sections } = useSectionSlice();
  const { firstFramePath } = useProjectSlice();
  const index = 1

  const { name, data } = sections[index]

  if(!data) return null

  const { total_Q, total_q_std, measured_Q, interpolated_Q, alpha, num_stations } = data


  return (
    <div id='report-section-container'>
      <div id='report-section-top-container'>
        
        <div id='report-section-top-left-container'>
            <h1> { name } </h1>
            <h3 id="report-section-discharge-label"> Discharge Q: {total_Q}  m&sup3;/s  (&plusmn; {total_q_std.toFixed(2)} m&sup3;/s)</h3>
            <h4 className="mt-1"> { measured_Q }% Measured </h4>
            <h4> { interpolated_Q}% Interpolated </h4>
            <h3 className="mt-2 report-section-title-1"> Alpha: { alpha } </h3>
            <h3 className="mt-1 report-section-title-1"> Number of stations: { num_stations } </h3>
            <img src={'/@fs' + firstFramePath} id="report-section-img"></img>
        </div>
        
        <div id='report-section-top-right-container'>
          <AllInOne width={450} height={550} index={1} isReport={true}></AllInOne>
        </div>

      </div>
      <ReportSectionTable data={data}></ReportSectionTable>
    </div>
  )
} 

