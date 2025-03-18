import { useTranslation } from "react-i18next";
import { useWizard } from "react-use-wizard";
import { LanguageSelector } from "../components/LanguageSelector";
import image from "../assets/logo.png";
import "./pages.css";
import { useProjectSlice, useUiSlice } from "../hooks";
// import { ThemeToggle } from '../components/ThemeToggle';

export const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const { nextStep, goToStep } = useWizard();
  const { onLoadProject } = useProjectSlice();
  const { onSetErrorMessage, error } = useUiSlice();

  const handleNewProjectClick = async (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    if (event.currentTarget.id === "new-project") {
      nextStep();
    } else {
      const result = await onLoadProject();
      if (typeof result === "number") {
        goToStep(result);
      } else {
        onSetErrorMessage(
          t("MainPage.Errors." + result, {
            defaultValue: t("MainPage.Errors.default"),
          }),
        );
      }
    }
  };

  return (
    <div className="App">
      <img src={image} className="home-page-image" alt="RIVeR Logo" />
      <div className="home-page-buttons">
        <button
          className="button-1"
          onClick={handleNewProjectClick}
          id="new-project"
        >
          {t("MainPage.start")}
        </button>
        <button
          className="button-1"
          onClick={handleNewProjectClick}
          id="load-project"
        >
          {t("MainPage.loadProject")}
        </button>
      </div>
      {error && <h4 className="home-page-error mb-1"> {error} </h4>}
      <p id="version-number">{import.meta.env.VITE_APP_VERSION}</p>
      <LanguageSelector />
      {/* <ThemeToggle /> */}
    </div>
  );
};
