import { useWizard } from "react-use-wizard";

export const Progress = () => {
  const { activeStep, stepCount } = useWizard();
  return (
    <div
      className="progress-indicator-container"
      style={{ width: `${stepCount - 2 <= 6 ? "80%" : "95%"} ` }}
    >
      {Array.from({ length: stepCount - 2 }, (_, index) => (
        <div
          className={`progress-indicator ${index <= activeStep - 2 ? "progress-indicator-active" : ""}`}
          key={index}
        />
      ))}
    </div>
  );
};
