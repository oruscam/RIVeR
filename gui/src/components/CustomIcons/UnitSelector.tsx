import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Icons } from "./Icons";
import "./piv-icons.css";
import { useProjectSlice } from "../../hooks";

export function SettingsBtn() {
    const { t } = useTranslation();
    const { projectDetails, onProjectDetailsChange } = useProjectSlice();
    const { unitSistem } = projectDetails;
    const [open, setOpen] = useState(false);
    const [unitOpen, setUnitOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const unitSistems = [
        { code: 'si', label: t('MainPage.Settings.si') },
        { code: 'imperial', label: t('MainPage.Settings.imperial') },
    ];

    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
                setUnitOpen(false);
            }
        };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    const handleSelectUnit = (code: string) => {
        onProjectDetailsChange({ ...projectDetails, unitSistem: code });
        localStorage.setItem("unitSystem", code);
        setOpen(false);
        setUnitOpen(false);
    };

    const handleChoosePath = async () => {
        setOpen(false);
        setUnitOpen(false);
        await window.ipcRenderer.invoke('choose-river-path');
    };

    return (
        <div className="lwrap" ref={ref}>
            <button
                className={`ib ${open ? "active" : ""}`}
                style={{ "--hi": "var(--accent)", width: 60, gap: 3, paddingInline: 10, border: 'none' } as React.CSSProperties}
                onClick={() => { setOpen(v => !v); if (open) setUnitOpen(false); }}
            >
                {Icons.Settings(open ? "var(--secondary-background-color)" : "var(--primary-text-color)")}
                {Icons.ChevDown("var(--secondary-text-color)", open ? 180 : 0)}
            </button>
            <div className={`ldrop ${open ? "open" : ""}`} style={{ minWidth: 160 }}>
                <div
                    style={{ position: 'relative' }}
                    onMouseEnter={() => setUnitOpen(true)}
                    onMouseLeave={() => setUnitOpen(false)}
                    onClick={() => setUnitOpen(v => !v)}
                >
                    <div className="litem">
                        <span>{t('MainPage.Settings.unitSystem')}</span>
                        <span style={{ marginLeft: 'auto', display: 'flex' }}>
                            {Icons.ChevDown("var(--secondary-text-color)", -90)}
                        </span>
                    </div>
                    {unitOpen && (
                        <div
                            className="ldrop"
                            style={{
                                position: 'absolute',
                                right: 'calc(100% + 4px)',
                                top: 0,
                                bottom: 'auto',
                                left: 'auto',
                                transform: 'none',
                                opacity: 1,
                                pointerEvents: 'all',
                            }}
                        >
                            {unitSistems.map(u => (
                                <div
                                    key={u.code}
                                    className={`litem ${u.code === unitSistem ? "sel" : ""}`}
                                    onClick={(e) => { e.stopPropagation(); handleSelectUnit(u.code); }}
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
                    )}
                </div>
                <div className="litem" onClick={handleChoosePath}>
                    <span>{t('MainPage.Settings.riverFolder')}</span>
                </div>
            </div>
        </div>
    );
}
