import { useTranslation } from 'react-i18next';
import { CircleCheckBig } from 'lucide-react';
import { SuccessBanner } from '../SuccessBanner';

export const SuccessfulMessage = ({ goToHomePage }: { goToHomePage: () => void }) => {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;

  const hyperlinkWord = currentLanguage === 'en' ? 'Home' : currentLanguage === 'es' ? 'Inicio' : "l'Accueil";

  return (
    <div id="successful-message" className="mt-4">
      <SuccessBanner icon={CircleCheckBig} title={t('Report.Success.title')}>
        {t('Report.Success.message')}
        <a
          onClick={goToHomePage}
          style={{ cursor: 'pointer', color: 'var(--success-color)', textDecoration: 'underline' }}
        >
          {hyperlinkWord}
        </a>
      </SuccessBanner>
    </div>
  );
};
