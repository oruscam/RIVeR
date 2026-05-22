import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Icons } from "./Icons";
import "./piv-icons.css";
import { useProjectSlice } from "../../hooks";

export function FolderBtn() {
    const [currentPath, setCurrentPath] = useState<string>('');

    useEffect(() => {
        window.ipcRenderer.invoke('get-river-path').then((p: string) => setCurrentPath(p ?? ''));
    }, []);

    const handleChoosePath = async () => {
        const newPath = await window.ipcRenderer.invoke('choose-river-path');
        if (newPath) setCurrentPath(newPath);
    };

    return (
        <button
            className="ib"
            style={{ "--hi": "var(--accent)", border: 'none' } as React.CSSProperties}
            title={currentPath}
            onClick={handleChoosePath}
        >
            {Icons.Folder("var(--primary-text-color)")}
        </button>
    );
}

export function UnitBtn() {
    const { t } = useTranslation();
    const { projectDetails, onProjectDetailsChange } = useProjectSlice();
    const { unitSistem } = projectDetails;
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const unitSistems = [
        { code: 'si', label: t('MainPage.Settings.si') },
        { code: 'imperial', label: t('MainPage.Settings.imperial') },
    ];

    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    const handleSelectUnit = (code: string) => {
        onProjectDetailsChange({ ...projectDetails, unitSistem: code });
        localStorage.setItem("unitSystem", code);
        setOpen(false);
    };

    return (
        <div className="lwrap" ref={ref}>
            <button
                className={`ib ${open ? "active" : ""}`}
                style={{ "--hi": "var(--accent)", width: 60, gap: 3, paddingInline: 10, border: 'none' } as React.CSSProperties}
                onClick={() => setOpen(v => !v)}
            >
                {Icons.Ruler(open ? "var(--secondary-background-color)" : "var(--primary-text-color)")}
                {Icons.ChevDown("var(--secondary-text-color)", open ? 180 : 0)}
            </button>
            <div className={`ldrop ${open ? "open" : ""}`} style={{ minWidth: 130 }}>
                {unitSistems.map(u => (
                    <div
                        key={u.code}
                        className={`litem ${u.code === unitSistem ? "sel" : ""}`}
                        onClick={() => handleSelectUnit(u.code)}
                    >
                        <span>{u.label}</span>
                        {u.code === unitSistem && (
                            <span style={{ marginLeft: "auto", display: "flex" }}>
                                {Icons.Check("var(--success-color)")}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

/** @deprecated Use FolderBtn and UnitBtn separately */
export function SettingsBtn() {
    return null;
}
