import { buildStepperContent } from './stepperContent';
import { MODULE_NUMBER, FOOTAGE_TYPES } from '../constants/constants';

describe('buildStepperContent', () => {
  it('marks Video Range as current and everything after it as upcoming', () => {
    const content = buildStepperContent(MODULE_NUMBER.VIDEO_RANGE, FOOTAGE_TYPES.UAV);
    expect(content.steps.map((s) => s.status)).toEqual([
      'current',
      'upcoming',
      'upcoming',
      'upcoming',
      'upcoming',
      'upcoming',
    ]);
    expect(content.stepNumber).toBe(1);
    expect(content.totalSteps).toBe(6);
    expect(content.currentLabelKey).toBe('VideoRange.title');
  });

  it('matches the audit mockup exactly: Processing is step 4 of 6, next is Results', () => {
    const content = buildStepperContent(MODULE_NUMBER.PROCESSING, FOOTAGE_TYPES.UAV);
    expect(content.stepNumber).toBe(4);
    expect(content.totalSteps).toBe(6);
    expect(content.currentLabelKey).toBe('Processing.title');
    expect(content.nextLabelKey).toBe('Results.title');
    expect(content.steps.map((s) => s.status)).toEqual([
      'done',
      'done',
      'done',
      'current',
      'upcoming',
      'upcoming',
    ]);
  });

  it('has no "next" on the last step, Report', () => {
    const content = buildStepperContent(MODULE_NUMBER.REPORT, FOOTAGE_TYPES.UAV);
    expect(content.stepNumber).toBe(6);
    expect(content.currentLabelKey).toBe('Report.Summary.title');
    expect(content.nextLabelKey).toBeNull();
    expect(content.steps.every((s, i) => (i < 5 ? s.status === 'done' : s.status === 'current'))).toBe(true);
  });

  it('names the Pixel Size step "PixelSize.title" for UAV footage', () => {
    const content = buildStepperContent(MODULE_NUMBER.PIXEL_SIZE, FOOTAGE_TYPES.UAV);
    expect(content.currentLabelKey).toBe('PixelSize.title');
  });

  it('names the Pixel Size step "ControlPoints.title" for Oblique footage', () => {
    const content = buildStepperContent(MODULE_NUMBER.PIXEL_SIZE, FOOTAGE_TYPES.OBLIQUE);
    expect(content.currentLabelKey).toBe('ControlPoints.title');
  });

  it('names the Pixel Size step "ControlPoints.title" for Ipcam footage', () => {
    const content = buildStepperContent(MODULE_NUMBER.PIXEL_SIZE, FOOTAGE_TYPES.IPCAM);
    expect(content.currentLabelKey).toBe('ControlPoints.title');
  });

  it('marks Cross Sections done once past it, without touching later steps', () => {
    const content = buildStepperContent(MODULE_NUMBER.RESULTS, FOOTAGE_TYPES.UAV);
    const crossSections = content.steps.find((s) => s.moduleNumber === MODULE_NUMBER.CROSS_SECTIONS);
    expect(crossSections?.status).toBe('done');
    expect(content.currentLabelKey).toBe('Results.title');
    expect(content.nextLabelKey).toBe('Report.Summary.title');
  });

  it('falls back to the first step for an activeStep outside the 6 (e.g. Home/Footage Mode)', () => {
    const content = buildStepperContent(0, FOOTAGE_TYPES.UAV);
    expect(content.stepNumber).toBe(1);
    expect(content.currentLabelKey).toBe('VideoRange.title');
  });
});
