import { useTranslation } from "react-i18next";
import { useProjectSlice } from "../../hooks";

export const FramesResolution = ({ active }: { active: boolean }) => {
  const { t } = useTranslation();
  const { video, onChangeFramesResolution } = useProjectSlice();
  const { data, parameters } = video;
  const { factor } = parameters;
  const { width, height } = data;

  // The first value is the original resolution
  // The second value is the resolution divided by 2
  // The third value is the resolution divided by 4
  const value1 = `${width}x${height}`;
  const value2 = `${width / 2}x${height / 2}`;
  const value3 = `${width / 4}x${height / 4}`;

  const onClickResolution = (event: React.MouseEvent<HTMLButtonElement>) => {
    const id = parseFloat((event.target as HTMLButtonElement).id);

    if (id !== factor) {
      onChangeFramesResolution(id);
    }
  };

  return (
    <div
      className={`video-resolution ${active ? "" : "hidden"}`}
      id="video-resolution"
    >
      <h2> {t("VideoRange.framesResolution")} </h2>
      <button
        className={`wizard-button mt-1 ${factor === 1 ? "wizard-button-active" : ""}`}
        type="button"
        id="1"
        onClick={onClickResolution}
      >
        {value1}
      </button>
      <button
        className={`wizard-button mt-1 ${factor === 0.5 ? "wizard-button-active" : ""}`}
        type="button"
        id="0.5"
        onClick={onClickResolution}
      >
        {value2}
      </button>
      <button
        className={`wizard-button mt-1 ${factor === 0.25 ? "wizard-button-active" : ""}`}
        type="button"
        id="0.25"
        onClick={onClickResolution}
      >
        {value3}
      </button>
    </div>
  );
};
