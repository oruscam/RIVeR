import { useTranslation } from 'react-i18next';
import { LuCheckCircle } from 'react-icons/lu';
import { SuccessBanner } from '../SuccessBanner';

export const SuccessfulMessage = ({ goToHomePage }: { goToHomePage: () => void }) => {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;

  const hyperlinkWord = currentLanguage === 'en' ? 'Home' : currentLanguage === 'es' ? 'Inicio' : "l'Accueil";

  return (
    <div id="successful-message" className="mt-4">
      <SuccessBanner icon={LuCheckCircle} title={t('Report.Success.title')}>
        {t('Report.Success.message')}
        <a onClick={goToHomePage} className="success-banner-link">
          {hyperlinkWord}
        </a>
      </SuccessBanner>
    </div>
  );
};
