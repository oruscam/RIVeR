import { useFormContext } from "react-hook-form";
import { useDataSlice, useUiSlice } from "../../hooks";
import { useTranslation } from "react-i18next";

export const HardModeProcessing = ({ active }: { active: boolean }) => {
  const { register } = useFormContext();
  const { processing, onUpdateProcessing, onReCalculateMask } = useDataSlice();
  const { onSetErrorMessage } = useUiSlice();
  const { medianTestFiltering, clahe, stdFiltering, heightRoi } =
    processing.form;

  const { t } = useTranslation();

  const handleHeightRoiInput = async (
    event: React.SyntheticEvent<HTMLInputElement>,
  ) => {
    if (
      (event as React.KeyboardEvent<HTMLInputElement>).key === "Enter" ||
      event.type === "blur"
    ) {
      event.preventDefault();
      const value = parseInt((event.target as HTMLInputElement).value);
      if (value !== heightRoi) {
        try {
          await onReCalculateMask(value);

          onUpdateProcessing({ heightRoi: value });
          document.getElementById("processing-HEADER")?.focus();
        } catch (error) {
          onSetErrorMessage((error as Error).message);
        }
      }
    }
  };

  return (
    <div
      className={`hard-mode-processing mt-5 ${active ? "" : "hidden"}`}
      id="processing-footer"
    >
      <div className="input-container-2 mb-2">
        <label className="read-only me-1">{t("Processing.roiHeight")}</label>
        <input
          className="input-field"
          {...register("roi_height")}
          onKeyDown={(event) => handleHeightRoiInput(event)}
          onBlur={(event) => handleHeightRoiInput(event)}
        ></input>
      </div>

      <h2 className="field-title mb-1">
        {" "}
        {t("Processing.preProcessingFilter")}
      </h2>

      <div className="switch-container mt-1">
        <h3 className="field-title"> {t("Processing.removeBackground")} </h3>
        <label className="switch">
          <input
            type="checkbox"
            {...register("remove_background")}
            onChange={(event) =>
              onUpdateProcessing({
                removeBackground: event.currentTarget.checked,
              })
            }
          />
          <span className="slider"></span>
        </label>
      </div>
      <div className="switch-container mt-1">
        <h3 className="field-title"> {t("Processing.clahe")} </h3>
        <label className="switch">
          <input
            type="checkbox"
            {...register("clahe")}
            onChange={(event) =>
              onUpdateProcessing({ clahe: event.currentTarget.checked })
            }
          />
          <span className="slider"></span>
        </label>
      </div>
      <div className="switch-container mt-1">
        <h3 className="field-title"> {t("Processing.clipLimit")} </h3>
        <input
          className="input-field-little"
          type="number "
          {...register("clip_limit")}
          disabled={!clahe}
          onChange={(event) =>
            onUpdateProcessing({ clipLimit: event.currentTarget.value })
          }
        ></input>
      </div>

      <h2 className="field-title mt-2">
        {" "}
        {t("Processing.postProcessingFilter")}{" "}
      </h2>

      <div className="switch-container mt-1">
        <h3 className="field-title"> {t("Processing.stdFiltering")} </h3>
        <label className="switch">
          <input
            type="checkbox"
            {...register("std_filtering")}
            onChange={(event) =>
              onUpdateProcessing({ stdFiltering: event.currentTarget.checked })
            }
          />
          <span className="slider"></span>
        </label>
      </div>
      <div className="switch-container mt-1">
        <h3 className="field-title"> {t("Processing.threshold")} </h3>
        <input
          className="input-field-little"
          type="number"
          {...register("std_threshold")}
          disabled={!stdFiltering}
        ></input>
      </div>
      <div className="switch-container mt-1">
        <h3 className="field-title"> {t("Processing.medianTestFiltering")} </h3>
        <label className="switch">
          <input
            type="checkbox"
            {...register("median_test")}
            onChange={(event) =>
              onUpdateProcessing({
                medianTestFiltering: event.currentTarget.checked,
              })
            }
          />
          <span className="slider"></span>
        </label>
      </div>
      <div className="switch-container mt-1">
        <h3 className="field-title"> {t("Processing.epsilon")} </h3>
        <input
          className="input-field-little"
          type="number"
          step="0.01"
          {...register("median_epsilon")}
          disabled={!medianTestFiltering}
          onChange={(event) =>
            onUpdateProcessing({ medianTestEpsilon: event.currentTarget.value })
          }
        />
      </div>
      <div className="switch-container mt-1">
        <h3 className="field-title"> {t("Processing.threshold")} </h3>
        <input
          className="input-field-little"
          type="number"
          {...register("median_threshold")}
          disabled={!medianTestFiltering}
          onChange={(event) =>
            onUpdateProcessing({
              medianTestThreshold: event.currentTarget.value,
            })
          }
        />
      </div>
    </div>
  );
};
