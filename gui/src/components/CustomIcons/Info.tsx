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
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--accent)" }}>
                {name}
            </span>
            <span style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.55, maxWidth: 270 }}>
                {desc}
            </span>
            {pill}
        </div>
    );
};
