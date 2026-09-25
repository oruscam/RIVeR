import { useTranslation } from 'react-i18next';
import './components.css';
import { useWizard } from 'react-use-wizard';
import { useDataSlice, useProjectSlice, useSectionSlice, useUiSlice } from '../hooks';
import { getStepLeaveEffect } from '../helpers';

type Props = {
  canFollow?: boolean;
  formId?: string;
  button?: boolean;
  onClickNext: () => void;
};

export const WizardButtons = ({
  canFollow = true,
  formId = '',
  button = false,
  onClickNext,
}: Partial<Props> = {}) => {
  const { previousStep, isFirstStep, activeStep, isLastStep } = useWizard();
  const { onSetActiveSection } = useSectionSlice();
  const { isBackendWorking } = useDataSlice();
  const { onSetDefaultProjectState } = useProjectSlice();
  const { onSetSeeAll } = useUiSlice();
  const { t } = useTranslation();

  const handlePreviuos = () => {
    getStepLeaveEffect(activeStep, { onSetActiveSection, onSetSeeAll, onSetDefaultProjectState })?.();
    previousStep();
  };

  return (
    <div className="wizard-container">
      {/* btn-lg, like every other wizard-screen button: these two were migrated in
          6a before .btn-lg existed as the adopted size, which left the app's most
          used controls 8px shorter than the buttons beside them. */}
      <button
        className="btn btn-lg btn-tertiary"
        onClick={handlePreviuos}
        disabled={isFirstStep || isBackendWorking}
      >
        {t('Wizard.back')}
      </button>

      <button
        className="btn btn-lg btn-primary"
        disabled={!canFollow || isBackendWorking}
        form={formId}
        onClick={onClickNext}
        type={button ? 'button' : 'submit'}
        id="wizard-next"
      >
        {isLastStep ? t('Wizard.save') : t('Wizard.next')}
      </button>
    </div>
  );
};
