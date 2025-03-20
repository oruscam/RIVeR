import "./components.css";
import "@theme-toggles/react/css/Classic.css";
import { Classic } from "@theme-toggles/react";
import { useUiSlice } from "../hooks/useUiSlice";

export const ThemeToggle = () => {
  const { darkMode, onChangeTheme } = useUiSlice();

  return (
    <div>
      <Classic
        toggled={!darkMode}
        onPointerEnterCapture={() => {}}
        onPointerLeaveCapture={() => {}}
        toggle={onChangeTheme}
        className="primary-color"
        placeholder={""}
      ></Classic>
    </div>
  );
};
