import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { GrLanguage } from "react-icons/gr";
import { useUiSlice } from "../hooks";

export const LanguageSelector = () => {
  const { t, i18n } = useTranslation();
  const { language, onSetLanguage } = useUiSlice();

  // Obtener todos los idiomas disponibles
  const availableLanguages = Object.keys(i18n.options.resources || {});
  
  // Mapeo de códigos de idioma a nombres
  const languageNames: Record<string, string> = {
    en: t("MainPage.english"),
    es: t("MainPage.spanish"), 
    fr: t("MainPage.french"),
    de: t("MainPage.german"),
    it: t("MainPage.italian"),
    pt: t("MainPage.portuguese")
  };

  const handleOnChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onSetLanguage(event.target.value);
  };

  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language]);

  return (
    <div className="language-selector">
      <GrLanguage className="language-selector-icon primary-color" />
      <select
        className="language-selector-select"
        value={language}
        onChange={handleOnChange}
      >
        {availableLanguages.map((lang) => (
          <option key={lang} value={lang}>
            {languageNames[lang] || lang.toUpperCase()}
          </option>
        ))}
      </select>
    </div>
  );
};