// src/components/CustomIcons/Info.tsx
import React from 'react';
import './piv-icons.css';

interface InfoProps {
  name: string;
  desc: string;
  pill: React.ReactNode;
}

export const Info: React.FC<InfoProps> = ({ name, desc, pill }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span
        style={{
          fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
          fontSize: 12,
          color: 'var(--accent-color)',
        }}
      >
        {name}
      </span>
      <span style={{ fontSize: 12, color: 'var(--secondary-text-color)', lineHeight: 1.55, maxWidth: 270 }}>
        {desc}
      </span>
      {pill}
    </div>
  );
};
