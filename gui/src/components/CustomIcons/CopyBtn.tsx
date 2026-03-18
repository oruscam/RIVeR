import { useState, useRef } from "react";
import { Icons } from "./Icons";

type CopyBtnProps = {
    onClickFunction: () => void;
}

export function CopyBtn({ onClickFunction }: CopyBtnProps) {
    const [isAnimating, setIsAnimating] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();

        // Clear any existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        setIsAnimating(true);

        onClickFunction();

        timeoutRef.current = setTimeout(() => {
            setIsAnimating(false);
        }, 400);
    };
    return (
        <div className="row">
            <button type="button" className={`ib ${isAnimating ? "active" : ""}`} onClick={handleClick}>
                <span className={`cl ${isAnimating ? "hide" : "show"}`}>{Icons.Copy("currentColor")}</span>
                <span className={`cl ${isAnimating ? "show cpop" : "hide"}`}>{Icons.Check("var(--green)")}</span>
            </button>
        </div>
    );
}