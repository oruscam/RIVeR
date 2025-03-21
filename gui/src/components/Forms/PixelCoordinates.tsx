import { useFormContext } from "react-hook-form";
import { useUiSlice } from "../../hooks";
import { getPointNames } from "../../helpers/index.ts";
import { useTranslation } from "react-i18next";

export const PixelCoordinates = ({
  modeName,
  onSetDirPoints,
}: {
  modeName: string;
  onSetDirPoints: (
    arg1: any,
    arg2: { point: number; position: string },
  ) => void;
}) => {
  const step = modeName === "pixel_size" ? "PixelSize" : "CrossSections";
  const { register, resetField } = useFormContext();
  const { onSetErrorMessage } = useUiSlice();
  const { t } = useTranslation();

  const { pointName1, pointName2 } = getPointNames(modeName);

  const handleInputField = (
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
      if (event.type !== "blur") {
        document.getElementById(nextFieldId)?.focus();
      }

      const value = parseFloat((event.target as HTMLInputElement).value);
      const target = event.target as HTMLInputElement;

      if (value < 0 || isNaN(value)) {
        const error = {
          [target.id]: {
            type: "required",
            message: `The value ${target.id} must be greater than 0 and can't be empty`,
          },
        };
        onSetErrorMessage(error);
        const fieldName = `${modeName}_${target.id}`;
        resetField(fieldName);
        return;
      }

      switch (target.id) {
        case `X_${pointName1}`:
          onSetDirPoints(null, { point: value, position: "x1" });
          break;

        case `Y_${pointName1}`:
          onSetDirPoints(null, { point: value, position: "y1" });
          break;

        case `X_${pointName2}`:
          onSetDirPoints(null, { point: value, position: "x2" });
          break;

        case `Y_${pointName2}`:
          onSetDirPoints(null, { point: value, position: "y2" });
          break;

        default:
          break;
      }
    }
  };

  return (
    <>
      <h2 className="form-subtitle mt-2 only-one-item" id="pixel-coordinates">
        {" "}
        {t(`${step}.Pixel.title`)}{" "}
      </h2>

      <div className="input-container-2 mt-2">
        <label
          className={`read-only me-1 ${modeName === "pixel_size" ? "" : "red"}`}
          htmlFor={`X_${pointName1}`}
        >
          {" "}
          {t(`${step}.Pixel.xPoint1`)}{" "}
        </label>
        <input
          type="number"
          step="any"
          className="input-field"
          id={`X_${pointName1}`}
          {...register(`${modeName}_X_${pointName1}`)}
          onKeyDown={(event) => handleInputField(event, `Y_${pointName1}`)}
          onBlur={(event) => handleInputField(event, `Y_${pointName1}`)}
        />
      </div>

      <div className="input-container-2 mt-1">
        <label
          className={`read-only me-1 ${modeName === "pixel_size" ? "" : "red"}`}
          htmlFor={`Y_${pointName1}`}
        >
          {t(`${step}.Pixel.yPoint1`)}
        </label>
        <input
          type="number"
          step="any"
          className="input-field"
          {...register(`${modeName}_Y_${pointName1}`)}
          id={`Y_${pointName1}`}
          onKeyDown={(event) => handleInputField(event, `X_${pointName2}`)}
          onBlur={(event) => handleInputField(event, `X_${pointName2}`)}
        />
      </div>

      <div className="input-container-2 mt-1">
        <label
          className={`read-only me-1 ${modeName === "pixel_size" ? "" : "green"}`}
          htmlFor={`X_${pointName2}`}
        >
          {t(`${step}.Pixel.xPoint2`)}
        </label>
        <input
          type="number"
          step="any"
          className="input-field"
          {...register(`${modeName}_X_${pointName2}`)}
          id={`X_${pointName2}`}
          onKeyDown={(event) => handleInputField(event, `Y_${pointName2}`)}
          onBlur={(event) => handleInputField(event, `Y_${pointName2}`)}
        />
      </div>

      <div className="input-container-2 mt-1 mb-2">
        <label
          className={`read-only me-1 ${modeName === "pixel_size" ? "" : "green"}`}
          htmlFor={`Y_${pointName2}`}
        >
          {t(`${step}.Pixel.yPoint2`)}
        </label>
        <input
          type="number"
          step="any"
          className="input-field"
          {...register(`${modeName}_Y_${pointName2}`)}
          id={`Y_${pointName2}`}
          onKeyDown={(event) => handleInputField(event, "wizard-next")}
          onBlur={(event) => handleInputField(event, "wizard-next")}
        />
      </div>
    </>
  );
};
