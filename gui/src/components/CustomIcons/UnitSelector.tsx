import { useState, useRef, useEffect } from "react";
import { Ruler } from "lucide-react";
import { Icons } from "./Icons";
import "./piv-icons.css";
import { useProjectSlice } from "../../hooks";

const unitSystems = [
    { code: 'si', label: 'SI (default)' },
    { code: 'imperial', label: 'Imperial' }
];

export function UnitBtn() {
    const { projectDetails, onProjectDetailsChange } = useProjectSlice();
    const { unitSistem } = projectDetails;
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    const handleSelect = (code: string) => {
        onProjectDetailsChange({
            ...projectDetails,
            unitSistem: code
        });
        setOpen(false);
    };

    return (
        <div className="lwrap" ref={ref}>
            <button className={`ib ${open ? "active" : ""}`}
                style={{ "--hi": "var(--accent)", width: 60, gap: 3, paddingInline: 10, border: 'none' } as React.CSSProperties}
                onClick={() => setOpen(v => !v)}>
                <Ruler size={21} color={open ? "var(--secondary-background-color)" : "var(--primary-text-color)"} />
                {Icons.ChevDown("var(--secondary-text-color)", open ? 180 : 0)}
            </button>
            <div className={`ldrop ${open ? "open" : ""}`} style={{ minWidth: 120 }}>
                {unitSystems.map(u => (
                    <div key={u.code} className={`litem ${u.code === unitSistem ? "sel" : ""}`}
                        onClick={() => handleSelect(u.code)}>
                        <span>{u.label}</span>
                        {u.code === unitSistem && <span style={{ marginLeft: "auto", display: "flex" }}>{Icons.Check("var(--success-color)")}</span>}
                    </div>
                ))}
            </div>
        </div>
    );
}
