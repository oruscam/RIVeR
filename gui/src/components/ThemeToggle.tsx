import { useState, useRef, useEffect } from 'react';
import './components.css';
import './CustomIcons/piv-icons.css';
import { useUiSlice } from '../hooks/useUiSlice';
import { ThemeType } from '../store/ui/types';
import { Icons } from './CustomIcons/Icons';

const THEMES: { value: ThemeType; label: string; icon: React.ReactNode }[] = [
  { value: 'dark', label: 'Dark', icon: Icons.Moon() },
  { value: 'light', label: 'Light', icon: Icons.Sun() },
  { value: 'dracula', label: 'Dracula', icon: Icons.Dracula() },
];

export const ThemeToggle = () => {
  const { theme, onSetTheme } = useUiSlice();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const currentTheme = THEMES.find((t) => t.value === theme) || THEMES[0];

  return (
    <div className="lwrap" ref={ref}>
      <button
        className={`ib ${open ? 'active' : ''}`}
        style={
          { '--hi': 'var(--accent)', width: 60, gap: 3, paddingInline: 10, border: 'none' } as React.CSSProperties
        }
        onClick={() => setOpen((v) => !v)}
      >
        <span style={{ fontSize: 17 }}>{currentTheme.icon}</span>
        {Icons.ChevDown('var(--secondary-text-color)', open ? 180 : 0)}
      </button>
      <div className={`ldrop ${open ? 'open' : ''}`}>
        {THEMES.map((t) => (
          <div
            key={t.value}
            className={`litem ${t.value === theme ? 'sel' : ''}`}
            onClick={() => {
              onSetTheme(t.value);
              setOpen(false);
            }}
          >
            <span style={{ fontSize: 17 }}>{t.icon}</span>
            <span>{t.label}</span>
            {t.value === theme && (
              <span style={{ marginLeft: 'auto', display: 'flex' }}>{Icons.Check('var(--success-color)')}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
