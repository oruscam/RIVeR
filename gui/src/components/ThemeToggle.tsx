import './components.css';
import "@theme-toggles/react/css/Classic.css";
import { Classic } from "@theme-toggles/react";
import { useUiSlice } from '../hooks/useUiSlice';

export const ThemeToggle: React.FC = () => {
  const { darkMode, onChangeTheme } = useUiSlice();
  
  return (
    <div>
      <Classic toggled={!darkMode}
      toggle={onChangeTheme}
      className='primary-color' placeholder={undefined} onPointerEnterCapture={undefined} onPointerLeaveCapture={undefined}>          
        </Classic>
    </div>
  );
};
