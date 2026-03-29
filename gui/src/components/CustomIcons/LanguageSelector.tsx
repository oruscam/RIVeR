import { useState, useRef, useEffect } from "react";
import { Icons } from "./Icons";
import "./piv-icons.css";
import { useTranslation } from "react-i18next";
import { useUiSlice } from "../../hooks";


const languageFlags: Record<string, string> = {
    en: '🇬🇧', es: '🇦🇷', fr: '🇫🇷', de: '🇩🇪',
    it: '🇮🇹', pt: '🇧🇷', ja: '🇯🇵', zh: '🇨🇳',
    ar: '🇸🇦', ko: '🇰🇷', ru: '🇷🇺', hi: '🇮🇳',
};

const languageKeys: Record<string, string> = {
    en: 'MainPage.english', es: 'MainPage.spanish',
    fr: 'MainPage.french', de: 'MainPage.german',
    it: 'MainPage.italian', pt: 'MainPage.portuguese',
    ja: 'MainPage.japanese', zh: 'MainPage.chinese',
    ar: 'MainPage.arabic', ko: 'MainPage.korean',
    ru: 'MainPage.russian', hi: 'MainPage.hindi',
};

export function LangBtn() {
    const { t, i18n } = useTranslation();
    const { language, onSetLanguage } = useUiSlice();
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const availableLanguages = Object.keys(i18n.options.resources || {});
    const langs = availableLanguages.map(code => ({
        code,
        label: t(languageKeys[code]) || code,
        flag: languageFlags[code] || '🌐',
    }));

    useEffect(() => {
        const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);


    useEffect(() => {
        i18n.changeLanguage(language);
    }, [language]);

    return (
        <div className="row">
            <div className="lwrap" ref={ref}>
                <button className={`ib ${open ? "active" : ""}`}
                    style={{ "--hi": "var(--accent)", width: 60, gap: 3, paddingInline: 10 }}
                    onClick={() => setOpen(v => !v)}>
                    {Icons.Globe(open ? "var(--accent)" : "var(--text)")}
                    {Icons.ChevDown("var(--muted)", open ? 180 : 0)}
                </button>
                <div className={`ldrop ${open ? "open" : ""}`}>
                    {langs.map(l => (
                        <div key={l.code} className={`litem ${l.code === language ? "sel" : ""}`}
                            onClick={() => { onSetLanguage(l.code); setOpen(false) }}>
                            <span style={{ fontSize: 17 }}>{l.flag}</span>
                            <span>{l.label}</span>
                            {l.code === language && <span style={{ marginLeft: "auto", display: "flex" }}>{Icons.Check("var(--accent)")}</span>}
                        </div>
                    ))}
                </div>
            </div>


        </div>
    );
}