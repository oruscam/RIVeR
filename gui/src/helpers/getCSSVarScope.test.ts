import { getCSSVar } from './getCSSVar';

type El = { id: string };
const appRoot: El = { id: 'app' };
const reportRoot: El = { id: 'report' };

const install = (withScope: boolean) => {
  (global as any).document = {
    documentElement: { id: 'html' },
    querySelector: (sel: string) =>
      sel === '[data-theme-scope]' ? (withScope ? reportRoot : null) : sel === '[data-theme]' ? appRoot : null,
  };
  (global as any).getComputedStyle = (el: El) => ({
    getPropertyValue: () => (el.id === 'report' ? '#0072B2' : '#56B4E9'),
  });
};

afterEach(() => {
  delete (global as any).document;
  delete (global as any).getComputedStyle;
});

test('reads from the app theme root when no report is mounted', () => {
  install(false);
  expect(getCSSVar('--tech-lspiv')).toBe('#56B4E9');
});

test('a mounted report scope wins over the app theme', () => {
  install(true);
  expect(getCSSVar('--tech-lspiv')).toBe('#0072B2');
});
