/**
 * Builds the shared TechniqueRow container's className: the base row class,
 * plus `technique-row-active`/`technique-row-hidden` state modifiers, plus
 * whatever screen-specific class the caller passes through (e.g.
 * Processing's `technique-row-processing` cursor/disabled modifiers).
 */
export const buildTechniqueRowClassName = (options: {
  active?: boolean;
  hidden?: boolean;
  className?: string;
}): string =>
  [
    'technique-row',
    options.active && 'technique-row-active',
    options.hidden && 'technique-row-hidden',
    options.className,
  ]
    .filter(Boolean)
    .join(' ');
