import { WizardButtons, ImageWithMarks, Error } from "../components"
import imagenPath from '../assets/4000x2250.jpg'
import { useUiSlice } from "../hooks"
import { getDistanceBetweenPoints, getNewImageResolution } from "../helpers/resolution"
import { ImageWithMarks2 } from "../components/ImageWithMarks2"
import { CrossSections } from "../components/CrossSections/index"

export const Step5 = () => {
  const { screenSizes } = useUiSlice()
  const {width: windowWidth} = screenSizes
  

  const values = getNewImageResolution(windowWidth, 4000, 2250)
  // const distanceBetweenPoints = getDistanceBetweenPoints(points)

  return (
    <div className="regular-page">
        <div className="media-container">
          <ImageWithMarks2 imagenPath={imagenPath} width={values.width} height={values.height} factor={values.factorX}></ImageWithMarks2>
          <Error></Error>
        </div>
        <div className="form-container">
            <CrossSections></CrossSections>
            <WizardButtons formId="cross-section"></WizardButtons>
        </div>
    </div>
  )
}
