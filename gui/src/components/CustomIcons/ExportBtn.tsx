
import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { useRipple } from './useRipple';
import './piv-icons.css'; // Asegúrate de que el CSS esté importado acá

interface ExportBtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    isCreating: boolean;
}

export const ExportBtn: React.FC<ExportBtnProps> = ({ isCreating, onClick, className = "", style, ...props }) => {
    const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
    const [rpl, fire] = useRipple();

    // Sincroniza la animación visual con el estado de tu app
    useEffect(() => {
        if (isCreating) {
            setPhase("running");
        } else if (phase === "running") {
            setPhase("done");
            setTimeout(() => setPhase("idle"), 2500);
        }
    }, [isCreating, phase]);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (phase !== "idle") return;
        fire("var(--text)");

        if (onClick) onClick(e);
    };

    const isDone = phase === "done";

    return (
        <button
            {...props}
            type="button"
            className={`ib ${phase === "running" ? "active" : ""} ${isDone ? "is-success" : ""} ${className}`}
            style={{ cursor: phase === "running" ? "wait" : "pointer", "--secondary-background-color": "var(--bg)", ...style } as React.CSSProperties}
            onClick={handleClick}
        >
            {rpl}
            {phase === "running" && <span className="progbar" />}

            <span className={`cl ${phase === "idle" ? "show" : "hide"}`}>
                {Icons.Video("currentColor")}
            </span>
            <span className={`cl ${phase === "running" ? "show" : "hide"}`}>
                <span className="spin">{Icons.Loader("currentColor")}</span>
            </span>
            <span className={`cl ${phase === "done" ? "show bdrop" : "hide"}`}>
                {Icons.Download("var(--green)")}
            </span>
        </button>
    );
};
