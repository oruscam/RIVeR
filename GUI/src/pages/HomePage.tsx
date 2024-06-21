import { useTranslation } from 'react-i18next';
import { useWizard } from 'react-use-wizard';
import { ThemeToggle } from '../components/ThemeToggle';
import { LanguageSelector } from '../components/LanguageSelector';
import image from '../assets/RIVeR-logo.png';
import './pages.css';

export const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const { nextStep } = useWizard();

  const handleClick = () => {
    nextStep();
  };

  return (
    <div className='App'>
      <img src={image} className='home-page-image' alt='RIVeR Logo' />
      <div className='home-page-buttons'>
        <button className='button-1' onClick={handleClick}>
          {t('MainPage.start')}
        </button>
        <button className='button-1'>{t('MainPage.loadProject')}</button>
      </div>
      <LanguageSelector />
      <ThemeToggle />
    </div>
  );
};
