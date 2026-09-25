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
import { VersionMessage, StepAlertList } from '../components';
import { ThemeToggle } from '../components/ThemeToggle';
import { CameraCalibration } from './CameraCalibration';

export const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const { nextStep, goToStep } = useWizard();
  const { onLoadProject } = useProjectSlice();
  const { onAddStepAlert, onClearStepAlert, onCheckVersion, theme } = useUiSlice();
  const [showCalibration, setShowCalibration] = useState(false);

  const handleNewProjectClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    if (event.currentTarget.id === 'new-project') {
      nextStep();
    } else {
      onClearStepAlert('home-load-project');
      const result = await onLoadProject();
      if (typeof result === 'number') {
        goToStep(result);
      } else {
        onAddStepAlert(
          'home-load-project',
          'error',
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
        <button className="btn btn-lg btn-primary" onClick={handleNewProjectClick} id="new-project">
          {t('MainPage.start')}
        </button>
        <button className="btn btn-lg btn-secondary" onClick={handleNewProjectClick} id="load-project">
          {t('MainPage.loadProject')}
        </button>
      </div>
      <StepAlertList />
      <div className="home-toolbar">
        <button className="btn btn-tertiary" onClick={() => setShowCalibration(true)}>
          {Icons.Camera('currentColor')}
          {t('Calibration.title')}
        </button>
        <VersionMessage />
        <div className="home-toolbar-group">
          <FolderBtn />
          <span className="home-toolbar-divider" />
          <UnitBtn />
          <LangBtn />
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
};
