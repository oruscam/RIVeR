// src/components/CustomIcons/Pill.tsx
import React from 'react';
import './piv-icons.css';

interface PillProps {
  label: string;
  color: string;
}

export const Pill: React.FC<PillProps> = ({ label, color }) => {
  return (
    <span className="pill" style={{ color, borderColor: color + '44', background: color + '11' }}>
      {label}
    </span>
  );
};
