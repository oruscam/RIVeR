jest.mock('../../hooks/useUiSlice', () => ({ useUiSlice: () => ({ stepAlerts: [] }) }));

import { stepAlertClassName } from './StepAlert';

describe('stepAlertClassName', () => {
  it.each([
    ['info', 'step-alert step-alert-info'],
    ['warning', 'step-alert step-alert-warning'],
    ['error', 'step-alert step-alert-error'],
  ] as const)('maps %s to %s', (level, expected) => {
    expect(stepAlertClassName(level)).toBe(expected);
  });
});
