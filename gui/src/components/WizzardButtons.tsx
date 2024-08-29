import { useTranslation } from 'react-i18next';
import './components.css';
import { useWizard } from 'react-use-wizard';
import { useSectionSlice } from '../hooks';

type Props = {
  canFollow?: boolean;
  formId?: string;
  button?: boolean;
  onClick: () => void;
};

export const WizardButtons = ({ canFollow = true, formId = '', button = false, onClick }: Partial<Props> = {}) => {
  const { previousStep, isFirstStep, activeStep } = useWizard();
  const { onSetActiveSection } = useSectionSlice()
  const { t } = useTranslation();

  const handlePreviuos = () => {
    if( activeStep === 4){
      onSetActiveSection(0)
      previousStep()
    }else{
      previousStep()
    }
  }

  return (
    <div className='wizard-container'>
      <button
        className='wizard-button button-1'
        onClick={handlePreviuos}
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
        id='wizard-next'
      >
        {t('Wizard.next')}
      </button>
    </div>
  );
};
