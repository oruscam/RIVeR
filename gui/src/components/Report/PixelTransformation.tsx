import { getUnit } from "../../helpers"
import { useProjectSlice, useSectionSlice } from "../../hooks"

export const PixelTransformation = () => {
  const { sections } = useSectionSlice()
  const { size } = sections[0].pixelSize
  const { projectDetails } = useProjectSlice()
  const { unitSistem } = projectDetails
  
  return (
    <>
      <h2 className="report-title-field mt-4"> Pixel Transformation </h2>
      <div id="report-pixel-transformation-container">
        <div>
          <p> Pixel size: </p>
          <p> { size }{getUnit(unitSistem, 'distance')} </p>
        </div>
        <div></div>
        <div></div>        
      </div>
    </>
  )
}
