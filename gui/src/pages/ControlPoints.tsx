import { FieldValues, FormProvider, useForm } from "react-hook-form"
import { Error, ImageWithControlPoints, Progress, WizardButtons } from "../components"
import { FormControlPoints } from "../components/Forms"
import { useMatrixSlice, useUiSlice } from "../hooks"
import { useWizard } from "react-use-wizard"
import { useEffect } from "react"

export const ControlPoints = () => {
  const { controlPoints, onGetTransformtionMatrix } = useMatrixSlice()
  const { distances } = controlPoints
  const { onSetErrorMessage } = useUiSlice()
  const { nextStep } = useWizard()
  
  const methods = useForm({
    defaultValues: {
      distance_12 : distances.d12.toFixed(2),
      distance_23 : distances.d23.toFixed(2),
      distance_34 : distances.d34.toFixed(2),
      distance_41 : distances.d41.toFixed(2),
      distance_13 : distances.d13.toFixed(2),
      distance_24 : distances.d24.toFixed(2),
    }
  })

  const onSubmit = ( values: FieldValues) => {
    onGetTransformtionMatrix('oblique', values)
    nextStep()
  }

  const onError = (error: any) => {
    onSetErrorMessage(error)
  }

  useEffect(() => {
    methods.reset({
      distance_12: distances.d12.toFixed(2),
      distance_23: distances.d23.toFixed(2),
      distance_34: distances.d34.toFixed(2),
      distance_41: distances.d41.toFixed(2),
      distance_13: distances.d13.toFixed(2),
      distance_24: distances.d24.toFixed(2),
    })
  }, [distances])

  return (
    <div className="regular-page">
        <div className="media-container">
            <ImageWithControlPoints/>
            <Error/>
        </div>
        <div className="form-container">
            <Progress />
            <FormProvider {...methods}>
                <FormControlPoints 
                  onSubmit={methods.handleSubmit(onSubmit, onError)}
                  onError={onError}/>
            </FormProvider>
            <WizardButtons formId="form-control-points" canFollow={controlPoints.drawPoints}/>
        </div>
    </div>
  )
}
