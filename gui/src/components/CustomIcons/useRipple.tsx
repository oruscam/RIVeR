// src/components/CustomIcons/useRipple.tsx

import React, { useState } from 'react';

interface Ripple {
  id: number;
  color: string;
}

export function useRipple(): [React.ReactNode[], (color: string) => void] {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const fire = (color: string) => {
    const id = Date.now() + Math.random();
    setRipples((r) => [...r, { id, color }]);
    setTimeout(() => setRipples((r) => r.filter((x) => x.id !== id)), 560);
  };

  const nodes = ripples.map((r) => <span key={r.id} className="rpl" style={{ background: r.color }} />);

  return [nodes, fire];
}
