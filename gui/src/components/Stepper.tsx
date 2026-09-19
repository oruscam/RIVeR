import { useWizard } from 'react-use-wizard';
import { useTranslation } from 'react-i18next';
import { useDataSlice, useProjectSlice, useSectionSlice, useUiSlice } from '../hooks';
import { applyStepLeaveEffects, buildStepperContent } from '../helpers';

export const Stepper = () => {
  const { activeStep, goToStep } = useWizard();
  const { t } = useTranslation();
  const { type, onSetDefaultProjectState } = useProjectSlice();
  const { isBackendWorking } = useDataSlice();
  const { onSetActiveSection } = useSectionSlice();
  const { onSetSeeAll } = useUiSlice();

  const content = buildStepperContent(activeStep, type);

  const handleJumpToStep = (target: number) => {
    if (isBackendWorking) return;
    applyStepLeaveEffects(activeStep, target, { onSetActiveSection, onSetSeeAll, onSetDefaultProjectState });
    goToStep(target);
  };

  return (
    <div className="stepper">
      <div className="stepper-bars">
        {content.steps.map((step) => (
          <button
            key={step.moduleNumber}
            type="button"
            className={`stepper-bar stepper-bar-${step.status}`}
            disabled={step.status !== 'done' || isBackendWorking}
            onClick={() => handleJumpToStep(step.moduleNumber)}
            aria-label={t(step.labelKey)}
          />
        ))}
      </div>
      <div className="stepper-caption">
        <span>
          <b>{t(content.currentLabelKey)}</b>
          {' · '}
          {t('Commons.stepOf', {
            defaultValue: 'Step {{n}} of {{total}}',
            n: content.stepNumber,
            total: content.totalSteps,
          })}
        </span>
        {content.nextLabelKey && (
          <span>{t('Commons.next', { defaultValue: 'Next: {{name}}', name: t(content.nextLabelKey) })}</span>
        )}
      </div>
    </div>
  );
};
