import { useWizard } from "react-use-wizard"

export const Progress = () => {
    const { activeStep, stepCount } = useWizard()
  return (
    <div className='progress-indicator-container' style={{ width: `${stepCount - 2 <= 6 ? "80%": "95%"} ` }}>
        {
            Array.from({ length: stepCount - 2 }, (_, i) => (
                <div className={`progress-indicator ${i <= activeStep - 2 ? 'progress-indicator-active' : ''}`}
                />
            ))
        }
    </div>
  )
}
