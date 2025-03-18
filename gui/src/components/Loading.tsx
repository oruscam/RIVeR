import { useUiSlice } from "../hooks";

interface LoadingProps {
  time?: string;
  percentage?: string;
  size?: string;
  isComplete?: boolean;
}

export const Loading = ({
  time,
  percentage,
  size = "mid",
  isComplete,
}: LoadingProps) => {
  const { message } = useUiSlice();

  return (
    <div className={`loader-container-${size}`}>
      <div className={`loader-wrapper-${size}`}>
        <div
          className={`loader-${size} ${isComplete ? `loader-complete-${size}` : ""}`}
        ></div>
        {percentage && (
          <div className={`loader-percentage-${size}`}>{percentage}</div>
        )}
      </div>
      {message && <p>{message}</p>}
      {time && <p className="loader-remaining-time">{time}</p>}
    </div>
  );
};
