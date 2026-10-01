import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProgressReadout } from '../components/ProgressReadout';

/**
 * The processing and calibration progress readout. The calibration loader used
 * to render an empty ring first and add its lines once the first percentage
 * arrived, so the centred block jumped. The readout renders every row from the
 * first frame; only the text inside them changes.
 */
const render = (percentage: number | null) =>
  renderToStaticMarkup(createElement(ProgressReadout, { percentage, label: 'LSPIV', time: 'Estimating…' }));

/** The markup without text, inline styles, the value and the colour-only pending modifier: what decides the layout. */
const skeleton = (html: string) =>
  html
    .replace(/>[^<]*</g, '><')
    .replace(/ style="[^"]*"/g, '')
    .replace(/ aria-valuenow="[^"]*"/g, '')
    .replace(/ is-pending/g, '');

describe('ProgressReadout', () => {
  it('renders the same rows before the first percentage as during the run', () => {
    expect(skeleton(render(null))).toBe(skeleton(render(42)));
    expect(skeleton(render(null))).toBe(skeleton(render(100)));
  });

  it('shows a dash, not an empty slot, before the first percentage', () => {
    expect(render(null)).toMatch(/class="progress-readout-value is-pending"[^>]*>–</);
  });

  it('shows the percentage and fills the line to it', () => {
    const html = render(42);
    expect(html).toMatch(/class="progress-readout-value"[^>]*>42%</);
    expect(html).toMatch(/transform:scaleX\(0\.42\)/);
  });

  it('keeps the label and the time in the footer', () => {
    const html = render(null);
    expect(html).toContain('>LSPIV<');
    expect(html).toContain('>Estimating…<');
  });

  it('exposes the value to assistive tech only once it is known', () => {
    expect(render(null)).not.toContain('aria-valuenow');
    expect(render(42)).toContain('aria-valuenow="42"');
    expect(render(42)).toContain('role="progressbar"');
  });
});
