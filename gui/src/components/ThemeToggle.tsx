import './components.css';
import { useUiSlice } from '../hooks/useUiSlice';
import { ThemeType } from '../store/ui/types';

const THEMES: { value: ThemeType; label: string; icon: string }[] = [
  { value: 'dark',    label: 'Dark',    icon: '🌑' },
  { value: 'light',   label: 'Light',   icon: '☀️' },
  { value: 'dracula', label: 'Dracula', icon: '🧛' },
];

export const ThemeToggle = () => {
  const { theme, onSetTheme } = useUiSlice();

  return (
    <div className="theme-segmented-control">
      {THEMES.map(({ value, label, icon }) => (
        <button
          key={value}
          className={`theme-segment-btn${theme === value ? ' theme-segment-btn--active' : ''}`}
          onClick={() => onSetTheme(value)}
          title={`Switch to ${label} theme`}
          aria-pressed={theme === value}
        >
          <span className="theme-segment-icon">{icon}</span>
          <span className="theme-segment-label">{label}</span>
        </button>
      ))}
    </div>
  );
};
