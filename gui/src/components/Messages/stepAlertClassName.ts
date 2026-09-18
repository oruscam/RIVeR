/** Pure so the level→class mapping is unit-tested without rendering. */
export const stepAlertClassName = (level: 'info' | 'warning' | 'error'): string =>
  `step-alert step-alert-${level}`;
