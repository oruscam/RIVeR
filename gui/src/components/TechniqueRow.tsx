import { HTMLAttributes, ReactNode } from 'react';
import { Technique } from '../store/section/types';
import { buildTechniqueRowClassName } from '../helpers/techniqueRowClassName';
import './components.css';

interface TechniqueRowProps extends Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'children'> {
  /** Which technique this row represents — drives the swatch's colour and shape. */
  technique: Technique;
  /** Whether this technique is the active one. Shown via a background and
   *  left to each caller to also reflect in its own label styling (bold
   *  text, inline colour) — TechniqueRow only owns the row's background. */
  active?: boolean;
  /** Whether this technique is currently hidden (Results only). Fades the row. */
  hidden?: boolean;
  /** Extra class(es) the caller wants on the row, e.g. Processing's
   *  `technique-row-processing` or `technique-row-processing-disabled`. */
  className?: string;
  /** The row's own content — Results passes its name button + trailing
   *  controls; Processing passes its field-title + trailing controls. Each
   *  screen keeps full ownership of what's clickable and how. */
  children: ReactNode;
}

/**
 * Shared visual shell for a technique picker row (LSPIV/STIV/iWave), used on
 * both Results (TechniqueLegend) and Processing (FormProcessing). Owns the
 * row container, the active/hidden state classes, and the colour+shape
 * swatch. Deliberately does NOT own any interaction (no onClick/role/tabIndex
 * of its own) — both screens now share the same selection model (the name is
 * the clickable control, not the row) and each supplies its own trailing
 * controls via `children` and forwarded div props (title, ...rest).
 */
export const TechniqueRow = ({
  technique,
  active = false,
  hidden = false,
  className,
  children,
  ...rest
}: TechniqueRowProps) => (
  <div className={buildTechniqueRowClassName({ active, hidden, className })} {...rest}>
    <span
      className={`technique-swatch technique-swatch-${technique}`}
      style={{ background: `var(--tech-${technique})` }}
    />
    {children}
  </div>
);
