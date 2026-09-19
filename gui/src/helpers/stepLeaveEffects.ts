import { MODULE_NUMBER } from '../constants/constants';

export interface StepLeaveHandlers {
  onSetActiveSection: (index: number) => void;
  onSetSeeAll: (value: boolean) => void;
  onSetDefaultProjectState: () => void;
}

/**
 * The side effect that must run when leaving `moduleNumber` backward — via
 * the wizard's single-step Back button, or a multi-step jump from the step
 * bar. Returns `undefined` when leaving that step has no extra effect.
 *
 * This is the single place that knows what "leaving a step backward" means,
 * so a multi-step jump can apply every intermediate step's effect in the
 * same order a sequence of single Back-clicks would have, instead of a
 * second, hand-written copy that could drift from this one.
 */
export function getStepLeaveEffect(moduleNumber: number, handlers: StepLeaveHandlers): (() => void) | undefined {
  switch (moduleNumber) {
    case MODULE_NUMBER.CROSS_SECTIONS:
      return () => handlers.onSetActiveSection(0);
    case MODULE_NUMBER.PROCESSING:
      return () => handlers.onSetSeeAll(true);
    case MODULE_NUMBER.VIDEO_RANGE:
      return () => handlers.onSetDefaultProjectState();
    default:
      return undefined;
  }
}

/**
 * Applies every leave-effect for the steps strictly between `target` and
 * `activeStep` (inclusive of `activeStep`, exclusive of `target`), in
 * descending order — the same sequence a series of single Back-clicks from
 * `activeStep` down to `target` would apply. Used by the step bar's
 * multi-step jump, so a jump of N steps back applies every intermediate
 * step's reset instead of skipping them.
 */
export function applyStepLeaveEffects(activeStep: number, target: number, handlers: StepLeaveHandlers): void {
  for (let step = activeStep; step > target; step--) {
    getStepLeaveEffect(step, handlers)?.();
  }
}
