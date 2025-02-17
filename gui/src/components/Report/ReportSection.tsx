import { REPORT_IMAGES,  } from "../../constants/constants";
import { useProjectSlice, useSectionSlice, useUiSlice } from "../../hooks"
import { AllInOne, VelocityVector } from "../Graphs";
import { ReportSectionTable } from "./ReportSectionTable";

interface ReportSectionProps {
  index: number;
  factor: {
    x: number;
    y: number
  }
}

export const ReportSection = ({ index, factor }: ReportSectionProps) => {
  const { sections, transformationMatrix } = useSectionSlice();
  const { name, data } = sections[index]
  const { firstFramePath } = useProjectSlice()

  if(!data) return null

  const { total_Q, total_q_std, measured_Q, interpolated_Q, alpha, num_stations } = data
  
  return (
    <div id='report-section-container'>
      <div id='report-section-top-container'>
        
        <div id='report-section-top-left-container'>
            <h1 className="report-section-title"> { name } </h1>
            <h3 id="report-section-discharge-label"> Discharge Q: {total_Q}  m&sup3;/s  (&plusmn; {total_q_std.toFixed(2)} m&sup3;/s)</h3>
            <h4 className="mt-1"> { measured_Q * 100 }% Measured </h4>
            <h4> { interpolated_Q * 100 } % Interpolated </h4>
            <h3 className="mt-2 report-section-title-1"> Alpha: { alpha } </h3>
            <h3 className="mt-1 report-section-title-1 mb-2"> Number of stations: { num_stations } </h3>
            <div className="image-and-svg-container">
              <img src={firstFramePath} className="image-border-radius" width={REPORT_IMAGES.IMAGES_WIDTH} height={REPORT_IMAGES.IMAGES_HEIGHT} />
              {
                sections.map((section, i) => {
                  if ( i === 0 || i !== index ) return null;
                  return (
                    <VelocityVector 
                        section={section}
                        key={i}
                        transformationMatrix={transformationMatrix}
                        sectionIndex={i}
                        width={REPORT_IMAGES.IMAGES_WIDTH} 
                        height={REPORT_IMAGES.IMAGES_HEIGHT} 
                        factor={factor}
                        isReport={true}
                        index={index}
                      />
                    )
                  })
              }
            </div>
        </div>
        
        <div id='report-section-top-right-container'>
          <AllInOne width={450} height={550} index={index} isReport={true}></AllInOne>
        </div>

      </div>
      <ReportSectionTable data={data}></ReportSectionTable>
    </div>
  )
} 

