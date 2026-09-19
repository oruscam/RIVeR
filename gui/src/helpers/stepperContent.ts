import { MODULE_NUMBER, FOOTAGE_TYPES } from '../constants/constants';

export type StepStatus = 'done' | 'current' | 'upcoming';

export interface StepInfo {
  moduleNumber: number;
  labelKey: string;
}

export interface StepperStep extends StepInfo {
  status: StepStatus;
}

export interface StepperContent {
  steps: StepperStep[];
  stepNumber: number;
  totalSteps: number;
  currentLabelKey: string;
  nextLabelKey: string | null;
}

const getPixelSizeLabelKey = (footageType: string): string =>
  footageType === FOOTAGE_TYPES.UAV ? 'PixelSize.title' : 'ControlPoints.title';

/**
 * The 6 user-facing wizard steps the step bar shows, in order. Each label
 * key is an existing, already-translated title key — the same one that
 * screen's own FormHeader already uses — so this introduces no new step-name
 * copy. The Pixel Size step's name depends on footage type, matching how
 * Uav.tsx vs. Oblique.tsx/Ipcam.tsx title their own FormHeader today.
 */
const getStepInfos = (footageType: string): StepInfo[] => [
  { moduleNumber: MODULE_NUMBER.VIDEO_RANGE, labelKey: 'VideoRange.title' },
  { moduleNumber: MODULE_NUMBER.PIXEL_SIZE, labelKey: getPixelSizeLabelKey(footageType) },
  { moduleNumber: MODULE_NUMBER.CROSS_SECTIONS, labelKey: 'CrossSections.title' },
  { moduleNumber: MODULE_NUMBER.PROCESSING, labelKey: 'Processing.title' },
  { moduleNumber: MODULE_NUMBER.RESULTS, labelKey: 'Results.title' },
  { moduleNumber: MODULE_NUMBER.REPORT, labelKey: 'Report.Summary.title' },
];

export function buildStepperContent(activeStep: number, footageType: string): StepperContent {
  const steps: StepperStep[] = getStepInfos(footageType).map((info) => ({
    ...info,
    status: info.moduleNumber < activeStep ? 'done' : info.moduleNumber === activeStep ? 'current' : 'upcoming',
  }));

  const currentIndex = steps.findIndex((step) => step.moduleNumber === activeStep);
  const resolvedIndex = currentIndex === -1 ? 0 : currentIndex;
  const current = steps[resolvedIndex];
  const next = resolvedIndex < steps.length - 1 ? steps[resolvedIndex + 1] : null;

  return {
    steps,
    stepNumber: resolvedIndex + 1,
    totalSteps: steps.length,
    currentLabelKey: current.labelKey,
    nextLabelKey: next ? next.labelKey : null,
  };
}
