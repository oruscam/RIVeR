// src/components/CustomIcons/IconPath.tsx

import React from 'react';

/* ─── INLINE SVG ICON ───
 * The `d` path data passed to this component is derived from Lucide
 * (https://lucide.dev), ISC License, Copyright (c) 2022 Lucide Contributors.
 * Lucide is itself derived from Feather (https://feathericons.com),
 * MIT License, Copyright (c) 2013-2022 Cole Bemis.
 * Inlined rather than imported so no icon library ships with the app.
 * See THIRD-PARTY-LICENSES.md.
 */
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
