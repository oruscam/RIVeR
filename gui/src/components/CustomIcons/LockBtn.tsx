import { useTranslation } from 'react-i18next';
import { Icons } from './Icons';
import { useSectionSlice } from '../../hooks';
import { useWizard } from 'react-use-wizard';
import { MODULE_NUMBER } from '../../constants/constants';
import { scrollBehavior } from '../../helpers/motion';

interface LockButtonProps {
  localExtraFields?: boolean;
  setLocalExtraFields?: any;
  footerElementID: string;
  headerElementID: string;
  disabled: boolean;
}

export function LockBtn({
  localExtraFields,
  setLocalExtraFields,
  footerElementID,
  headerElementID,
  disabled,
}: LockButtonProps) {
  const { onSetExtraFields, sections, activeSection } = useSectionSlice();
  const { extraFields, name } = sections[activeSection];
  const { activeStep } = useWizard();
  const { t } = useTranslation();

  const checked = localExtraFields !== undefined ? localExtraFields : extraFields;

  const handleOnChange = () => {
    switch (activeStep) {
      case MODULE_NUMBER.CROSS_SECTIONS:
        if (extraFields) {
          const header = name + '-' + headerElementID;
          const headerElement = document.getElementById(header);
          headerElement?.scrollIntoView({ behavior: scrollBehavior() });
        } else {
          const footer = name + '-' + footerElementID;

          const footerElement = document.getElementById(footer);
          setTimeout(() => {
            footerElement?.scrollIntoView({ behavior: scrollBehavior() });
          }, 50);
        }
        onSetExtraFields();
        break;

      case MODULE_NUMBER.PIXEL_SIZE:
        if (extraFields) {
          const headerElement = document.getElementById(headerElementID);
          headerElement?.scrollIntoView({ behavior: scrollBehavior() });
        } else {
          const footerElement = document.getElementById(footerElementID);
          setTimeout(() => {
            footerElement?.scrollIntoView({ behavior: scrollBehavior() });
          }, 100);
        }
        setLocalExtraFields();
        break;

      case MODULE_NUMBER.VIDEO_RANGE:
        if (extraFields) {
          const headerElement = document.getElementById(headerElementID);
          headerElement?.scrollIntoView({ behavior: scrollBehavior() });
        } else {
          const footerElement = document.getElementById(footerElementID);
          setTimeout(() => {
            footerElement?.scrollIntoView({ behavior: scrollBehavior() });
          }, 50);
        }
        setLocalExtraFields(!localExtraFields);
        break;

      case MODULE_NUMBER.PROCESSING:
        if (localExtraFields) {
          const headerElement = document.getElementById(headerElementID);
          headerElement?.scrollIntoView({ behavior: scrollBehavior() });
        } else {
          const footerElement = document.getElementById(footerElementID);
          setTimeout(() => {
            footerElement?.scrollIntoView({ behavior: scrollBehavior() });
          }, 50);
        }
        setLocalExtraFields(!localExtraFields);
        break;

      default:
        if (localExtraFields) {
          const headerElement = document.getElementById(headerElementID);
          headerElement?.scrollIntoView({ behavior: scrollBehavior() });
        } else {
          const footerElement = document.getElementById(footerElementID);
          setTimeout(() => {
            footerElement?.scrollIntoView({ behavior: scrollBehavior() });
          }, 50);
        }
        setLocalExtraFields(!localExtraFields);
        break;
    }
  };

  return (
    <div className="switch-container advanced-mode-toggle">
      <span className="advanced-mode-label">
        {Icons.Lock('currentColor')}
        {t('Commons.advancedSettings', { defaultValue: 'Advanced settings' })}
      </span>
      <label className="switch">
        <input type="checkbox" checked={checked} onChange={handleOnChange} disabled={disabled} />
        <span className="slider"></span>
      </label>
    </div>
  );
}
