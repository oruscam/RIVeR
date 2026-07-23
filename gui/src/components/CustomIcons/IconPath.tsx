// src/components/CustomIcons/IconPath.tsx

import React from 'react';

/* ─── INLINE SVG ICON (Lucide paths, no library needed) ─── */
interface IconPathProps {
  d: string;
  size?: number;
  color?: string;
  extra?: string[];
}

export const IconPath: React.FC<IconPathProps> = ({ d, size = 21, color = 'currentColor', extra = [] }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {[d, ...extra].map((path, i) => (
      <path key={i} d={path} />
    ))}
  </svg>
);
