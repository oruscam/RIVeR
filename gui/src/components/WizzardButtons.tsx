import { useTranslation } from "react-i18next";
import "./components.css";
import { useWizard } from "react-use-wizard";
import {
  useDataSlice,
  useMatrixSlice,
  useProjectSlice,
  useSectionSlice,
} from "../hooks";
import { MODULE_NUMBER } from "../constants/constants";

type Props = {
  canFollow?: boolean;
  formId?: string;
  button?: boolean;
  onClickNext: () => void;
};

export const WizardButtons = ({
  canFollow = true,
  formId = "",
  button = false,
  onClickNext,
}: Partial<Props> = {}) => {
  const { previousStep, isFirstStep, activeStep, isLastStep } = useWizard();
  const { onSetActiveSection, onResetSectionSlice } = useSectionSlice();
  const { onClearQuiver, isBackendWorking, onResetDataSlice } = useDataSlice();
  const { onResetProjectSlice } = useProjectSlice();
  const { onResetMatrixSlice } = useMatrixSlice();
  const { t } = useTranslation();

  const handlePreviuos = () => {
    switch (activeStep) {
      case MODULE_NUMBER.CROSS_SECTIONS:
        onSetActiveSection(0);
        previousStep();
        break;

      case MODULE_NUMBER.PROCESSING:
        previousStep();
        break;

      case MODULE_NUMBER.ANALIZING:
        previousStep();
        onClearQuiver();
        break;

      case MODULE_NUMBER.VIDEO_RANGE:
        onResetProjectSlice();
        onResetDataSlice();
        onResetSectionSlice();
        onResetMatrixSlice();
        previousStep();
        break;

      default:
        previousStep();
    }
  };

  return (
    <div className="wizard-container">
      <button
        className="wizard-button button-1"
        onClick={handlePreviuos}
        disabled={isFirstStep || isBackendWorking}
      >
        {t("Wizard.back")}
      </button>

      <button
        className="wizard-button button-1"
        disabled={!canFollow || isBackendWorking}
        form={formId}
        onClick={onClickNext}
        type={button ? "button" : "submit"}
        id="wizard-next"
      >
        {isLastStep ? t("Wizard.save") : t("Wizard.next")}
      </button>
    </div>
  );
};
