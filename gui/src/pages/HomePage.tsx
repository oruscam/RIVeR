import { useTranslation } from 'react-i18next';
import { useWizard } from 'react-use-wizard';
import { LangBtn } from '../components/CustomIcons/LanguageSelector';
import { FolderBtn, UnitBtn } from '../components/CustomIcons/UnitSelector';
import image from '../assets/logo.png';
import imageLigtht from '../assets/logo_light.png';
import './pages.css';
import { Icons } from '../components/CustomIcons/Icons';
import { useProjectSlice, useUiSlice } from '../hooks';
import { useEffect, useState } from 'react';
import { VersionMessage } from '../components';
import { ThemeToggle } from '../components/ThemeToggle';
import { CameraCalibration } from './CameraCalibration';

export const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const { nextStep, goToStep } = useWizard();
  const { onLoadProject } = useProjectSlice();
  const { onSetErrorMessage, error, onCheckVersion, isLatestVersion, theme } = useUiSlice();
  const [showCalibration, setShowCalibration] = useState(false);

  const handleNewProjectClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    if (event.currentTarget.id === 'new-project') {
      nextStep();
    } else {
      const result = await onLoadProject();
      if (typeof result === 'number') {
        goToStep(result);
      } else {
        onSetErrorMessage(
          t('MainPage.Errors.' + result, {
            defaultValue: t('MainPage.Errors.default'),
          })
        );
      }
    }
  };

  useEffect(() => {
    onCheckVersion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="default-app-container">
      {showCalibration && <CameraCalibration onClose={() => setShowCalibration(false)} />}
      <img src={theme === 'light' ? imageLigtht : image} className="home-page-image" alt="RIVeR Logo" />
      <div className="home-page-buttons">
        <button className="button-1" onClick={handleNewProjectClick} id="new-project">
          {t('MainPage.start')}
        </button>
        <button className="button-1" onClick={handleNewProjectClick} id="load-project">
          {t('MainPage.loadProject')}
        </button>
      </div>
      {error && <h4 className="home-page-error mb-1"> {error} </h4>}
      <p id="version-number">{import.meta.env.VITE_APP_VERSION}</p>
      {isLatestVersion !== undefined && <VersionMessage />}
      <div className="row" style={{ position: 'absolute', bottom: '30px', right: '50px' }}>
        <FolderBtn />
        <UnitBtn />
        <LangBtn />
        <ThemeToggle />
      </div>
      <button
        className="ib"
        style={{ position: 'absolute', bottom: '30px', left: '50px', border: 'none' } as React.CSSProperties}
        onClick={() => setShowCalibration(true)}
        title={t('Calibration.title')}
        aria-label={t('Calibration.title')}
      >
        {Icons.Camera('var(--primary-text-color)')}
      </button>
    </div>
  );
};
