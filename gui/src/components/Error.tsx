import "./components.css";
import { useUiSlice } from "../hooks/useUiSlice";

export const Error = () => {
  const { error } = useUiSlice();

  return (
    <div className="error" style={{ opacity: error.length !== 0 ? 1 : 0 }} id="error-message-div">
      {error.map((value, key) => (
        <div key={key} className="error-text">
          - { value }
        </div>
      ))}
    </div>
  );
};
