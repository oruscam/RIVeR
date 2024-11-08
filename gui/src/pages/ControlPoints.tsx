import { FormProvider, useForm } from "react-hook-form"
import { ImageWithControlPoints, Progress, WizardButtons } from "../components"
import { FormControlPoints } from "../components/Forms"
import { useMatrixSlice } from "../hooks"
import { useEffect } from "react"

export const ControlPoints = () => {
  const { controlPoints } = useMatrixSlice()
  const { distances } = controlPoints
  
  const methods = useForm({
    defaultValues: {
      distance_12 : distances.d12.toFixed(2),
      distance_13 : distances.d13.toFixed(2),
      distance_14 : distances.d14.toFixed(2),
      distance_23 : distances.d23.toFixed(2),
      distance_24 : distances.d24.toFixed(2),
      distance_34 : distances.d34.toFixed(2)
    }
  })

  useEffect(() => {
    methods.reset({
      distance_12 : distances.d12.toFixed(2),
      distance_13 : distances.d13.toFixed(2),
      distance_14 : distances.d14.toFixed(2),
      distance_23 : distances.d23.toFixed(2),
      distance_24 : distances.d24.toFixed(2),
      distance_34 : distances.d34.toFixed(2)
    })
  }, [distances])

  return (
    <div className="regular-page">
        <div className="media-container">
            <ImageWithControlPoints/>
        </div>
        <div className="form-container">
            <Progress />
            <FormProvider {...methods}>
                <FormControlPoints/>
            </FormProvider>
            <WizardButtons/>
        </div>
    </div>
  )
}
