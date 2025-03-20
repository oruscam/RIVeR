import { useFormContext } from "react-hook-form";
import { useMatrixSlice, useUiSlice } from "../../hooks";
import { FormChild } from "../../types";
import { getValidationRules } from "../../helpers";
import { useTranslation } from "react-i18next";
import { OrthoImage } from "../Graphs";

export const FormRectification2D = ({ onSubmit, onError }: FormChild) => {
  const { obliquePoints, onSetDrawPoints, onGetDistances, isBackendWorking } =
    useMatrixSlice();
  const {
    drawPoints,
    isDefaultCoordinates,
    isDistancesLoaded,
    solution,
    rwCoordinates,
  } = obliquePoints;

  const { onSetErrorMessage } = useUiSlice();

  const { t } = useTranslation();

  const { register, getValues } = useFormContext();

  const validationRules = getValidationRules(t, getValues, 0);

  const handleOnClickImportDistances = () => {
    onGetDistances().catch((error) => onSetErrorMessage(error.message));
  };

  return (
    <>
      <h1 className="form-title"> {t("ControlPoints.title")} </h1>
      <form
        onSubmit={onSubmit}
        onError={onError}
        id="form-control-points"
        className={`form-scroll ${isBackendWorking ? "disabled" : ""}`}
      >
        <div className="form-base-2">
          <div className="input-container-2">
            <button
              className={`wizard-button button-rectification me-1 ${drawPoints ? "wizard-button-active" : ""}`}
              id="draw-coordinates"
              type="button"
              onClick={onSetDrawPoints}
            >
              {" "}
              {t("ControlPoints.drawPoints")}{" "}
            </button>
            <button
              className={`wizard-button button-rectification ${isDistancesLoaded ? "wizard-button-active" : ""}`}
              id="import-distances"
              type="button"
              onClick={handleOnClickImportDistances}
              disabled={drawPoints === false}
            >
              {" "}
              {t("ControlPoints.importDistances")}{" "}
            </button>
          </div>

          <div className="input-container-2 mt-2">
            <label className="read-only-rectification-2d me-1" id="D12">
              1-2
            </label>
            <input
              className="input-field-rectification-2d"
              type="number"
              id="distance_12"
              disabled={isDefaultCoordinates}
              {...register("distance_12", validationRules.distances)}
              step={0.01}
            />
          </div>

          <div className="input-container-2 mt-1">
            <label className="read-only-rectification-2d me-1" id="D23">
              2-3
            </label>
            <input
              className="input-field-rectification-2d"
              type="number"
              id="distance_23"
              disabled={isDefaultCoordinates}
              {...register("distance_23", validationRules.distances)}
              step={0.01}
            />
          </div>

          <div className="input-container-2 mt-1">
            <label className="read-only-rectification-2d me-1" id="D34">
              3-4
            </label>
            <input
              className="input-field-rectification-2d"
              type="number"
              id="distance_34"
              disabled={isDefaultCoordinates}
              {...register("distance_34", validationRules.distances)}
              step={0.01}
            />
          </div>

          <div className="input-container-2 mt-1">
            <label className="read-only-rectification-2d me-1" id="D14">
              4-1
            </label>
            <input
              className="input-field-rectification-2d"
              type="number"
              id="distance_41"
              disabled={isDefaultCoordinates}
              {...register("distance_41", validationRules.distances)}
              step={0.01}
            />
          </div>

          <div className="input-container-2 mt-1">
            <label className="read-only-rectification-2d me-1" id="D13">
              1-3
            </label>
            <input
              className="input-field-rectification-2d"
              type="number"
              id="distance_13"
              disabled={isDefaultCoordinates}
              {...register("distance_13", validationRules.distances)}
              step={0.01}
            />
          </div>

          <div className="input-container-2 mt-1 mb-2">
            <label className="read-only-rectification-2d me-1" id="D24">
              2-4
            </label>
            <input
              className="input-field-rectification-2d"
              type="number"
              id="distance_24"
              disabled={isDefaultCoordinates}
              {...register("distance_24", validationRules.distances)}
              step={0.01}
            />
          </div>

          {solution && (
            <OrthoImage solution={solution} coordinates={rwCoordinates} />
          )}
          <button
            className="wizard-button form-button solver-button"
            id="solve-oblique"
            disabled={isDefaultCoordinates}
          >
            {t("Commons.solve")}
          </button>
        </div>
      </form>
    </>
  );
};
