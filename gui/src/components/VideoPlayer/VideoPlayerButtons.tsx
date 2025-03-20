import { Icon } from "../Icon.tsx";
import { previous, next, play, pause } from "../../assets/icons/icons.ts";
import { useProjectSlice } from "../../hooks/useProjectSlice.ts";

interface VideoPlayerButtonsProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  control: { play: boolean };
  setControl: React.Dispatch<
    React.SetStateAction<{ play: boolean; volume: boolean }>
  >;
}

export const VideoPlayerButtons = ({
  videoRef,
  control,
  setControl,
}: VideoPlayerButtonsProps) => {
  const { video } = useProjectSlice();
  const { fps } = video.data || { fps: 0 };

  const handlePreviuos = () => {
    const step = document.getElementById("input-step") as HTMLInputElement;
    if (videoRef.current) {
      videoRef.current.currentTime -= (1 / fps) * parseFloat(step.value);
    }
    return;
  };

  const handleNext = () => {
    const step = document.getElementById("input-step") as HTMLInputElement;
    if (videoRef.current) {
      videoRef.current.currentTime += (1 / fps) * parseFloat(step.value);
    }
    return;
  };

  const handlePlay = () => {
    if (videoRef.current) {
      if (control.play) {
        videoRef.current.pause();
        setControl((prevControl) => ({ ...prevControl, play: false }));
      } else {
        videoRef.current.play();
        setControl((prevControl) => ({ ...prevControl, play: true }));
      }
    }
  };

  return (
    <div className="video-player-buttons">
      <button className="video-button" onClick={handlePreviuos}>
        {" "}
        <Icon path={previous} />
      </button>
      <button className="video-button" onClick={handlePlay}>
        {" "}
        <Icon path={control.play ? pause : play} />
      </button>
      <button className="video-button" onClick={handleNext}>
        {" "}
        <Icon path={next} />
      </button>
    </div>
  );
};
