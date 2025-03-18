import { useFormContext } from "react-hook-form";
import { getPointNames } from "../../helpers/index";
import { useSectionSlice, useUiSlice } from "../../hooks";
import { useTranslation } from "react-i18next";

export const RealWorldCoordinates = ({
  modeName,
  onSetRealWorld,
}: {
  modeName: string;
  onSetRealWorld: (value: number, key: string) => void;
}) => {
  const step = modeName === "pixel_size" ? "PixelSize" : "CrossSections";
  const { pointName1, pointName2 } = getPointNames(modeName);
  const { register, resetField } = useFormContext();
  const { onSetErrorMessage } = useUiSlice();

  const { t } = useTranslation();

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

      if (isNaN(value)) {
        const error = {
          [target.id]: {
            type: "required",
            message: `The value ${target.id} must be a number`,
          },
        };

        onSetErrorMessage(error);
        const fieldName = `${modeName}_${target.id}`;
        resetField(fieldName);
        return;
      }

      switch (target.id) {
        case `EAST_${pointName1}`:
          onSetRealWorld(value, "x1");
          break;

        case `NORTH_${pointName1}`:
          onSetRealWorld(value, "y1");
          break;

        case `EAST_${pointName2}`:
          onSetRealWorld(value, "x2");

          break;

        case `NORTH_${pointName2}`:
          onSetRealWorld(value, "y2");
          break;

        default:
          break;
      }
    }
  };

  {
    `read-ony me-1 %{modeName === 'pixel_size' ? '' : 'red'}`;
  }
  return (
    <>
      <h2 className="form-subtitle mt-5 only-one-item" id="REAL_WORLD">
        {" "}
        Real World Coordinates{" "}
      </h2>

      <div className="input-container-2 mt-2">
        <label
          className={`read-only me-1 ${modeName === "pixel_size" ? "" : "red"}`}
          htmlFor={`EAST_${pointName1}`}
        >
          {t(`${step}.RealWorld.eastPoint1`)}
        </label>
        <input
          type="number"
          step="any"
          className="input-field"
          {...register(`${modeName}_EAST_${pointName1}`)}
          id={`EAST_${pointName1}`}
          onKeyDown={(event) => handleInputField(event, `NORTH_${pointName1}`)}
          onBlur={(event) => handleInputField(event, `NORTH_${pointName1}`)}
        />
      </div>

      <div className="input-container-2 mt-1">
        <label
          className={`read-only me-1 ${modeName === "pixel_size" ? "" : "red"}`}
          htmlFor={`NORTH_${pointName1}`}
        >
          {" "}
          {t(`${step}.RealWorld.northPoint1`)}
        </label>
        <input
          type="number"
          step="any"
          className="input-field"
          {...register(`${modeName}_NORTH_${pointName1}`)}
          id={`NORTH_${pointName1}`}
          onKeyDown={(event) => handleInputField(event, `EAST_${pointName2}`)}
          onBlur={(event) => handleInputField(event, `EAST_${pointName2}`)}
        />
      </div>

      <div className="input-container-2 mt-1">
        <label
          className={`read-only me-1 ${modeName === "pixel_size" ? "" : "green"}`}
          htmlFor={`EAST_${pointName2}`}
        >
          {" "}
          {t(`${step}.RealWorld.eastPoint2`)}
        </label>
        <input
          type="number"
          step="any"
          className="input-field"
          {...register(`${modeName}_EAST_${pointName2}`)}
          id={`EAST_${pointName2}`}
          onKeyDown={(event) => handleInputField(event, `NORTH_${pointName2}`)}
          onBlur={(event) => handleInputField(event, `NORTH_${pointName2}`)}
        />
      </div>

      <div className="input-container-2 mt-1">
        <label
          className={`read-only me-1 ${modeName === "pixel_size" ? "" : "green"}`}
          htmlFor={`NORTH_${pointName2}`}
        >
          {" "}
          {t(`${step}.RealWorld.northPoint2`)}
        </label>
        <input
          type="number"
          step="any"
          className="input-field"
          {...register(`${modeName}_NORTH_${pointName2}`)}
          id={`NORTH_${pointName2}`}
          onKeyDown={(event) => handleInputField(event, "pixel-coordinates")}
          onBlur={(event) => handleInputField(event, "pixel-coordinates")}
        />
      </div>
    </>
  );
};
