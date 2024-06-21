import { useTranslation } from 'react-i18next';
import './components.css';
import { useWizard } from 'react-use-wizard';

type Props = {
  canFollow: boolean;
  formId: string;
  button: boolean;
  onClick: () => void;
};

export const WizardButtons = ({ canFollow = true, formId = '', button = false, onClick }: Partial<Props> = {}) => {
  const { previousStep, isFirstStep } = useWizard();
  const { t } = useTranslation();
  return (
    <div className='wizard-container'>
      <button
        className='wizard-button button-1'
        onClick={previousStep}
        disabled={isFirstStep}
      >
        {t('Wizard.back')}
      </button>

      <button
        className='wizard-button button-1'
        disabled={!canFollow}
        form={formId}
        onClick={onClick}
        type={ button ? "button" : "submit"}
      >
        {t('Wizard.next')}
      </button>
    </div>
  );
};
