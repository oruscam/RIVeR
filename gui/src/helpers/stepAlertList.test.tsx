import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

jest.mock('../hooks/useUiSlice', () => ({
  useUiSlice: () => ({
    stepAlerts: [
      { id: 'processing-backend-error', level: 'error', text: 'shown by the button' },
      { id: 'processing-load-results', level: 'error', text: 'shown at the top' },
    ],
  }),
}));

// Imported after the mock so the component picks it up.
import { StepAlertList } from '../components/Messages/StepAlert';

describe('StepAlertList exclude', () => {
  it('leaves out the alerts another part of the panel shows', () => {
    const html = renderToStaticMarkup(createElement(StepAlertList, { exclude: ['processing-backend-error'] }));
    expect(html).toContain('shown at the top');
    expect(html).not.toContain('shown by the button');
  });
});
