import { useTranslation } from "react-i18next";
import { check } from "../../assets/icons/icons";
import { Icon } from "../Icon";

export const SuccessfulMessage = ( { goToHomePage } : { goToHomePage: () => void} ) => {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;

  const hyperlinkWord = currentLanguage === "en" ? "home" : currentLanguage === "es" ? "inicio" : "l'accueil";

  return (
    <div id="successful-container" className="mt-4">
      <Icon path={check} id="check-icon" />

      <div id="successful-message-container">
        <h3 id="successful-title">{t("Report.Success.title")}</h3>
        <p id="successful-message" className="mt-1">
          {t("Report.Success.message")}
          <a onClick={ goToHomePage } id="hyperlink-word" style={{ cursor: "pointer", color: "white", textDecoration: "underline" }}>
            {hyperlinkWord}
          </a>
        </p>
      </div>
    </div>
  );
};
