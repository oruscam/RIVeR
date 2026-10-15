/** Pure so it can be unit-tested without rendering — the aria-label needs the
 *  meta folded in, since visually it's a separate, smaller span. */
export const buildModeHintAriaLabel = (hint: { text: string; meta?: string } | null): string => {
  if (hint === null) return '';
  return hint.meta ? `${hint.text}, ${hint.meta}` : hint.text;
};
