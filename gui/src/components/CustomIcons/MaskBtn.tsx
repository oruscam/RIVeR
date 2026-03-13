// src/components/CustomIcons/MaskBtn.tsx

import React, { useState, useRef } from 'react';
import { Icons } from './Icons';
import { useRipple } from './useRipple';
import './piv-icons.css';

interface MaskBtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    isDrawing?: boolean; // Opcional, por si prefieres controlarlo desde afuera como el ExportBtn
}

export const MaskBtn: React.FC<MaskBtnProps> = ({ isDrawing: externalIsDrawing, onClick, className = "", style, ...props }) => {
    // Si no le pasas isDrawing, manejará su propio estado interno
    const [internalDrawing, setInternalDrawing] = useState(false);
    const [rpl, fire] = useRipple();
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Usa el estado externo si existe, si no, usa el interno
    const drawing = externalIsDrawing !== undefined ? externalIsDrawing : internalDrawing;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (externalIsDrawing === undefined) {
            const next = !internalDrawing;
            setInternalDrawing(next);
            fire("var(--violet)");
            if (timerRef.current) clearTimeout(timerRef.current);

            // Cambiamos 'next' a verdadero para que aparezca la máscara al presionar
            if (next && onClick) {
                onClick(e);
            }
        } else {
            if (!externalIsDrawing) {
                fire("var(--violet)");
            }
        }
    };

    return (
        <button
            {...props}
            type="button"
            className={`ib ${drawing ? "active pulse" : ""} ${className}`}
            style={{ "--hi": "var(--violet)", ...style } as React.CSSProperties}
            onClick={handleClick}
        >
            {rpl}
            <span className={`cl ${drawing ? "hide" : "show"}`}>
                {Icons.BoxSel("var(--text)")}
            </span>
            <span className={`cl ${drawing ? "show" : "hide"}`}>
                {Icons.PenLine("var(--violet)")}
            </span>
        </button>
    );
};
