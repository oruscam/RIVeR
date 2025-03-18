import "./form.css";
import { useDataSlice, useUiSlice } from "../../hooks";
import { useTranslation } from "react-i18next";
import { Loading } from "../Loading";
import React, { useEffect } from "react";

export const FormAnalizing = () => {
  const { onSetQuiverAll, isBackendWorking, onKillBackend, quiver } =
    useDataSlice();
  const { onSetErrorMessage } = useUiSlice();
  const { t } = useTranslation();

  const [percentage, setPercentage] = React.useState<string>("");
  const [time, setTime] = React.useState<string>("");

  const handleAnalize = () => {
    if (isBackendWorking) return;
    setPercentage("");
    setTime("");
    onSetQuiverAll().catch((error) => onSetErrorMessage(error.message));
  };

  const handleStop = async () => {
    setPercentage("");
    setTime("");
    const result = await onKillBackend();
    if (result === true) {
      setPercentage("");
      setTime("");
    }
  };

  if (isBackendWorking === false && percentage === "97%") {
    setPercentage("100%");
  }

  useEffect(() => {
    const handleRiverCliMessage = (_event: any, text: string) => {
      // Expresión regular para extraer el porcentaje
      const percentageMatch = text.match(/(\d+%)\|/);
      let newPercentage = percentageMatch ? percentageMatch[1] : "";

      // Expresión regular para extraer el tiempo
      const timeMatch = text.match(/\[(\d{2}:\d{2})<(\d{2}:\d{2})/);
      let newTime = timeMatch ? timeMatch[2] : "";

      if (isBackendWorking === false && quiver !== undefined) {
        newPercentage = "100%";
        newTime = "00:00";
      }

      if (newPercentage !== percentage) {
        setPercentage(newPercentage);
      }

      if (newTime !== time) {
        setTime("Remaining time: " + newTime);
      }
    };

    window.ipcRenderer.on("river-cli-message", handleRiverCliMessage);

    // Cleanup function to remove the listener
    return () => {
      window.ipcRenderer.removeListener(
        "river-cli-message",
        handleRiverCliMessage,
      );
    };
  }, [percentage, time]);

  return (
    <>
      <h1 className="form-title-analizing"> {t("Analizing.title")} </h1>
      <div className="form-base-2" id="form-analizing">
        <div className="input-container-2" id="analize-div">
          <button
            className={`wizard-button form-button ${isBackendWorking ? "wizard-button-active" : ""}`}
            onClick={handleAnalize}
          >
            {t("Analizing.analize")}
          </button>
        </div>
        <div className="analizing-output">
          {percentage !== "" && (
            <Loading
              percentage={percentage}
              time={time}
              size={"big"}
              isComplete={percentage === "100%"}
            />
          )}
        </div>
        <button
          id="stop-analize"
          className={`danger-button  'danger-button-active' : ''}`}
          onClick={handleStop}
          disabled={!isBackendWorking}
        >
          {" "}
          {t("Analizing.stop")}{" "}
        </button>
      </div>
    </>
  );
};
