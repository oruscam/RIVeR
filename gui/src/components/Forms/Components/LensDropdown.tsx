import { useState, useRef, useEffect } from 'react';

type Option = { label: string; value: string | number };

type Props = {
  options: Option[];
  value: string | number;
  onChange: (value: string | number) => void;
  disabled?: boolean;
  onOpen?: () => void;
};

export const LensDropdown = ({ options, value, onChange, disabled, onOpen }: Props) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const current = options.find((o) => o.value === value);

  return (
    <div className="lwrap" ref={ref}>
      <button
        type="button"
        className="lens-row-trigger"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) setTimeout(() => onOpen?.(), 50);
        }}
        disabled={disabled}
      >
        <span>{current?.label ?? ''}</span>
        <span className="lens-row-chevron">›</span>
      </button>
      <div
        className={`ldrop ldrop--right ${open ? 'open' : ''}`}
        style={{ top: 'calc(100% + 6px)', bottom: 'auto', minWidth: 160 }}
      >
        {options.map((opt) => (
          <div
            key={String(opt.value)}
            className={`litem ${opt.value === value ? 'sel' : ''}`}
            onClick={() => {
              onChange(opt.value);
              setOpen(false);
            }}
          >
            {opt.label}
          </div>
        ))}
      </div>
    </div>
  );
};
