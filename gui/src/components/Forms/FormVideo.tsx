import { useEffect, useState } from "react";
import { FieldValues, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useUiSlice } from "../../hooks/useUiSlice";
import { useWizard } from "react-use-wizard";
import { getValidationRules } from "../../helpers/validationRules";
import { useProjectSlice } from "../../hooks";
import "./form.css";
import { formatTime } from "../../helpers";
import { identifyTimeFormat, parseTime } from "../../helpers/formatTime";
import { VideoMetadata } from "./VideoMetadata";
import { ButtonLock } from "../ButtonLock";
import { FramesResolution } from "./FramesResolution";

export const FormVideo = ({ duration }: { duration: number }) => {
  const { onSetVideoParameters, video: videoData } = useProjectSlice();
  const { startTime, endTime, step } = videoData.parameters;
  const [extraFields, setExtraFields] = useState(false);
  const { fps } = videoData.data;

  const { handleSubmit, register, setValue, getValues, watch } = useForm({
    defaultValues: {
      start: formatTime(startTime, "mm:ss"),
      end: formatTime(endTime !== 0 ? endTime : duration, "mm:ss"),
      step: step,
    },
  });

  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const { t } = useTranslation();
  const { nextStep } = useWizard();
  const { onSetErrorMessage } = useUiSlice();

  const watchStep = watch("step");
  const watchStartTime = watch("start");
  const watchEndTime = watch("end");

  const validationRules = getValidationRules(t, getValues, duration);

  const timeBetweenFrames = ((1 / (fps || 0)) * watchStep * 1000).toFixed(2);

  const numberOfFrames = Math.floor(
    ((parseTime(watchEndTime) - parseTime(watchStartTime)) * fps) / watchStep,
  );

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (video !== null) {
      const number = video.currentTime;

      const id = (event.target as HTMLButtonElement).id;
      if (id === "start-button") {
        setValue("start", formatTime(number, "mm:ss"), {
          shouldValidate: true,
        });
      } else {
        setValue("end", formatTime(number, "mm:ss"), { shouldValidate: true });
      }
    }
  };

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    let value = event.target.value;
    const id = event.target.id;
    const timeformat = identifyTimeFormat(value);

    if (timeformat === "mm:ss") {
      setValue(id as "start" | "end" | "step", value, { shouldValidate: true });
    } else if (timeformat === "seconds") {
      value = formatTime(parseFloat(value), "mm:ss");
      setValue(id as "start" | "end" | "step", value, { shouldValidate: true });
    } else {
      setValue(
        id as "start" | "end" | "step",
        id === "start" ? "00:00" : formatTime(duration, "mm:ss"),
        { shouldValidate: false },
      );
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const id = (event.target as HTMLInputElement).id;

      if (id === "step") return;

      let value = (event.target as HTMLInputElement).value;
      const timeformat = identifyTimeFormat(value);

      if (timeformat === "mm:ss") {
        setValue(id as "start" | "end" | "step", value, {
          shouldValidate: true,
        });
      } else if (timeformat === "seconds") {
        value = formatTime(parseFloat(value), "mm:ss");
        setValue(id as "start" | "end" | "step", value, {
          shouldValidate: true,
        });
      } else {
        setValue(
          id as "start" | "end" | "step",
          id === "start" ? "00:00" : formatTime(duration, "mm:ss"),
          { shouldValidate: false },
        );
      }

      const nextElement = document.getElementById(
        id === "start" ? "end" : "input-step",
      );
      nextElement?.focus();
    }
  };

  const onSubmit = async (data: FieldValues) => {
    onSetVideoParameters(data);
    nextStep();
  };

  const onError = (error: any) => {
    console.log(error);
    onSetErrorMessage(error);
  };

  useEffect(() => {
    setVideo(document.getElementById("video") as HTMLVideoElement);
  }, [watchStep]);

  return (
    <>
      <h1 className="form-title">{t("VideoRange.title")}</h1>
      <form
        onSubmit={handleSubmit(onSubmit, onError)}
        id="form-video"
        className="form-scroll mt-2"
      >
        <div className="form-base-2">
          <div className="input-container-2 mt-2">
            <button
              type="button"
              onClick={handleClick}
              className="wizard-button form-button me-1"
              id="start-button"
            >
              {" "}
              {t("VideoRange.start")}
            </button>
            <input
              className="input-field"
              defaultValue="00:00"
              id="start"
              type="text"
              {...register("start", validationRules.start)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="input-container-2 mt-1">
            <button
              type="button"
              className="wizard-button form-button me-1"
              onClick={handleClick}
              id="end-button"
            >
              {" "}
              {t("VideoRange.end")}{" "}
            </button>
            <input
              type="text"
              className="input-field"
              defaultValue="00:00"
              id="end"
              {...register("end", validationRules.end)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="input-container-2 mt-1">
            <label className="read-only me-1"> {t("VideoRange.step")} </label>
            <input
              type="number"
              id="input-step"
              defaultValue={1}
              className="input-field"
              onKeyDown={handleKeyDown}
              {...register("step", validationRules.step)}
            />
          </div>
          <div className="form-video-extra-info-row mt-1 frames-info">
            <p>{t("VideoRange.ExtraInfo.timeBetweenFrame")}</p>
            <p>{timeBetweenFrames}ms</p>
          </div>
          <div className="form-video-extra-info-row frames-info">
            <p>{t("VideoRange.ExtraInfo.numberOfFrames")}</p>
            <p>{numberOfFrames > 0 ? numberOfFrames : 0}</p>
          </div>

          <VideoMetadata />

          <FramesResolution active={extraFields} />
        </div>
      </form>
      <ButtonLock
        localExtraFields={extraFields}
        localSetExtraFields={setExtraFields}
        disabled={false}
        headerElementID="start"
        footerElementID="video-resolution"
      />
    </>
  );
};
