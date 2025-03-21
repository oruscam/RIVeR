import { useFormContext } from "react-hook-form";
import {
  useDataSlice,
  useMatrixSlice,
  useProjectSlice,
  useSectionSlice,
  useUiSlice,
} from "../../hooks";
import { RealWorldCoordinates, PixelCoordinates } from "./index";
import { Bathimetry } from "../Graphs";
import { useTranslation } from "react-i18next";

interface FormCrossSectionsProps {
  onSubmit: (data: React.SyntheticEvent<HTMLFormElement, Event>) => void;
  name: string;
  index: number;
}

export const FormCrossSections = ({
  onSubmit,
  name,
  index,
}: FormCrossSectionsProps) => {
  const { register, setValue } = useFormContext();
  const {
    sections,
    activeSection,
    onUpdateSection,
    onGetBathimetry,
    transformationMatrix,
    onSetDirPoints,
    onSetRealWorld,
  } = useSectionSlice();
  const { drawLine, bathimetry, extraFields, pixelSize } =
    sections[activeSection];
  const { onSetErrorMessage } = useUiSlice();
  const { isBackendWorking } = useDataSlice();
  const { type } = useProjectSlice();
  const { ipcam } = useMatrixSlice();

  const { t } = useTranslation();

  const { yMax, yMin, xMin, x1Intersection, leftBank, xMax } = bathimetry;

  const handleKeyDownBathLevel = (
    event:
      | React.KeyboardEvent<HTMLInputElement>
      | React.FocusEvent<HTMLInputElement>,
    nextFieldId: string,
  ) => {
    if (
      (event as React.KeyboardEvent<HTMLInputElement>).key === "Enter" ||
      event.type === "blur"
    ) {
      event.preventDefault();

      const value = parseFloat((event.target as HTMLInputElement).value);

      if (isNaN(value) || value === bathimetry.level) return;

      if (
        yMax !== undefined &&
        yMin !== undefined &&
        value <= yMax &&
        value >= yMin
      ) {
        onUpdateSection({ level: value }, ipcam.cameraSolution?.cameraMatrix);
        document.getElementById(nextFieldId)?.focus();
      } else {
        setValue(`${name}_LEVEL`, bathimetry.level);
        onSetErrorMessage({
          Level: {
            type: "error",
            message: t("CrossSections.Errors.levelError", {
              yMin: yMin?.toFixed(2),
              yMax: yMax?.toFixed(2),
            }),
          },
        });
      }
    }
  };

  const handleImportBath = async (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    if (type === "ipcam") {
      onGetBathimetry(ipcam.cameraSolution?.cameraMatrix, ipcam.zLimits)
        // First error is when the bathimetry format is correct, but not the values
        .then((error) => {
          if (error?.message) {
            const message = "CrossSections.Errors." + error?.message;
            onSetErrorMessage({
              Bathimetry: {
                type: "error",
                message: t(message, { level: error?.value }),
              },
            });
          }
        })
        // Second error is when the bathimetry format is incorrect
        .catch((error) => onSetErrorMessage(error.message));
    } else {
      onGetBathimetry(undefined).catch((error) =>
        onSetErrorMessage(error.message),
      ); // Incorrect format
    }
  };

  const handleLeftBankInput = (
    event:
      | React.KeyboardEvent<HTMLInputElement>
      | React.FocusEvent<HTMLInputElement>,
  ) => {
    if (
      (event as React.KeyboardEvent<HTMLInputElement>).key === "Enter" ||
      event.type === "blur"
    ) {
      event.preventDefault();
      const value = parseFloat((event.target as HTMLInputElement).value);

      if (
        !isNaN(value) &&
        (x1Intersection ?? 0) + value >= (xMin ?? 0) &&
        (x1Intersection ?? 0) + value <= (xMax ?? 0)
      ) {
        document.getElementById("wizard-next")?.focus();
        onUpdateSection({ leftBank: value }, undefined);
      } else {
        onSetErrorMessage({
          LeftBank: {
            type: "Error",
            message: t("CrossSections.Errors.leftBank"),
          },
        });
        setValue(`${name}_LEFT_BANK`, leftBank);
      }
    }
  };

  return (
    <div
      id="form-section-div"
      className={activeSection !== index ? "hidden" : ""}
    >
      <form
        className={`form-scroll ${isBackendWorking ? "disabled" : ""}`}
        onSubmit={onSubmit}
        id="form-cross-section"
      >
        <span id={`${name}-HEADER`} />
        <span id={`${name}-form-cross-section-header`} />
        <div className="form-base-2 mt-2">
          {type === "ipcam" ? (
            <>
              <div className="input-container-2 mb-1">
                <input
                  type="file"
                  id={`${name}_CS_BATHIMETRY`}
                  className="hidden-file-input"
                  accept=".csv"
                  {...register(`${name}_CS_BATHIMETRY`, {
                    validate: (value) => {
                      if (
                        sections[index].bathimetry.path === "" &&
                        value.length === 0
                      ) {
                        return t("CrossSections.Errors.bathimetryIsRequired", {section_name: name});
                      }
                      return true;
                    },
                  })}
                />
                <button
                  className={`wizard-button form-button bathimetry-button mt-1 me-1 ${bathimetry.path ? "wizard-button-active" : ""}`}
                  onClick={handleImportBath}
                  disabled={
                    transformationMatrix.length === 0
                      ? false
                      : type === "ipcam"
                        ? false
                        : pixelSize.rwLength === 0
                  }
                >
                  {" "}
                  {t("CrossSections.importBath")}{" "}
                </button>
                <label className="read-only bg-transparent mt-1">
                  {bathimetry.name !== "" ? bathimetry.name : ""}
                </label>
              </div>
              <div className="input-container-2">
                <button
                  className={`wizard-button form-button me-1 ${drawLine ? "wizard-button-active" : ""}`}
                  type="button"
                  id={`${name}-DRAW_LINE`}
                  onClick={() => onUpdateSection({ drawLine: true }, undefined)}
                  disabled={transformationMatrix.length === 0}
                >
                  {" "}
                  {t("CrossSections.drawLine")}{" "}
                </button>
                <span className="read-only bg-transparent"></span>
              </div>
            </>
          ) : (
            <>
              <div className="input-container-2">
                <button
                  className={`wizard-button form-button me-1 ${drawLine ? "wizard-button-active" : ""}`}
                  type="button"
                  id={`${name}-DRAW_LINE`}
                  onClick={() => onUpdateSection({ drawLine: true }, undefined)}
                  disabled={transformationMatrix.length === 0}
                >
                  {" "}
                  {t("CrossSections.drawLine")}{" "}
                </button>
                <span className="read-only bg-transparent"></span>
              </div>

              <div className="input-container-2">
                <input
                  type="file"
                  id={`${name}_CS_BATHIMETRY`}
                  className="hidden-file-input"
                  accept=".csv"
                  {...register(`${name}_CS_BATHIMETRY`, {
                    validate: (value) => {
                      if (
                        sections[index].bathimetry.path === "" &&
                        value.length === 0
                      ) {
                        return t("CrossSections.Errors.bathimetryIsRequired", {section_name: name});
                      }
                      return true;
                    },
                  })}
                />
                <button
                  className={`wizard-button form-button bathimetry-button mt-1 me-1 ${bathimetry.path ? "wizard-button-active" : ""}`}
                  onClick={handleImportBath}
                  disabled={
                    transformationMatrix.length === 0
                      ? false
                      : type === "ipcam"
                        ? false
                        : pixelSize.rwLength === 0
                  }
                >
                  {" "}
                  {t("CrossSections.importBath")}{" "}
                </button>
                <label className="read-only bg-transparent mt-1">
                  {bathimetry.name !== "" ? bathimetry.name : ""}
                </label>
              </div>
            </>
          )}

          <div className="input-container-2 mt-2 mb-1">
            <label className="read-only me-1" htmlFor="LEVEL">
              {t("CrossSections.level")}
            </label>
            <input
              type="number"
              step="any"
              className="input-field"
              {...register(`${name}_LEVEL`, {
                validate: () => bathimetry.level !== 0,
              })}
              id="LEVEL"
              onKeyDown={(event) =>
                handleKeyDownBathLevel(event, "left-bank-station-input")
              }
              onBlur={(event) =>
                handleKeyDownBathLevel(event, "left-bank-station-input")
              }
            />
          </div>

          <div className="input-container-2 mb-1">
            <label className="read-only me-1" htmlFor="CS_LENGTH">
              {t("CrossSections.width")}
            </label>
            <input
              type="number"
              className="input-field-read-only"
              disabled={true}
              {...register(`${name}_CS_LENGTH`, {
                validate: (value) =>
                  value != 0 ||
                  t("CrossSections.Errors.rwLength", { section_name: name }),
              })}
              id="CS_LENGTH"
              readOnly={true}
            />
          </div>

          <Bathimetry showLeftBank={true} />

          <div
            className="input-container-2 mb-4"
            id="left-bank-station-container"
          >
            <label
              className="read-only me-1"
              htmlFor="left-bank-station-input"
              id="left-bank-station-label"
            >
              {t("CrossSections.leftBankStation")}
            </label>
            <input
              type="number"
              className="input-field"
              step="any"
              id="left-bank-station-input"
              {...register(`${name}_LEFT_BANK`)}
              onKeyDown={handleLeftBankInput}
              onBlur={handleLeftBankInput}
            />
          </div>

          <div className={extraFields ? "mt-3" : "hidden"}>
            <RealWorldCoordinates
              modeName={name}
              onSetRealWorld={onSetRealWorld}
            />
            <PixelCoordinates modeName={name} onSetDirPoints={onSetDirPoints} />
            <span id={`span-footer-${name}`}></span>
            <span id={`${name}-form-cross-section-footer`} />
          </div>
        </div>
      </form>
    </div>
  );
};
