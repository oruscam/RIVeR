import { useTranslation } from 'react-i18next';
import './components.css';
import { useWizard } from 'react-use-wizard';
import { useDataSlice, useSectionSlice } from '../hooks';
import { ANALIZING_STEP_NUMBER, CROSS_SECTIONS_STEP_NUMBER, PROCESSING_STEP_NUMBER } from '../constants/constants';

type Props = {
  canFollow?: boolean;
  formId?: string;
  button?: boolean;
  onClickNext: () => void;
};

export const WizardButtons = ({ canFollow = true, formId = '', button = false, onClickNext }: Partial<Props> = {}) => {
  const { previousStep, isFirstStep, activeStep } = useWizard();
  const { onSetActiveSection } = useSectionSlice()
  const { onClearQuiver, analizing } = useDataSlice()
  const { t } = useTranslation();

  const handlePreviuos = () => {
    switch(activeStep){
      case CROSS_SECTIONS_STEP_NUMBER:
        onSetActiveSection(0)
        previousStep()
        break;
      
      case PROCESSING_STEP_NUMBER:
        onClearQuiver()
        previousStep()
        break;

      case ANALIZING_STEP_NUMBER:
        previousStep()
        onClearQuiver()
        break;
      
      default:
        previousStep()
    }
  }

  console.log(analizing)

  return (
    <div className='wizard-container'>
      <button
        className='wizard-button button-1'
        onClick={handlePreviuos}
        disabled={isFirstStep || analizing}
      >
        {t('Wizard.back')}
      </button>

      <button
        className='wizard-button button-1'
        disabled={!canFollow || analizing}
        form={formId}
        onClick={onClickNext}
        type={ button ? "button" : "submit"}
        id='wizard-next'
      >
        {t('Wizard.next')}
      </button>
    </div>
  );
};
