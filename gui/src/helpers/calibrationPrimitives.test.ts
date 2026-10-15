import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = join(__dirname, '..');
const indexCss = readFileSync(join(SRC, 'index.css'), 'utf8');
const messagesCss = readFileSync(join(SRC, 'components/Messages/messages.css'), 'utf8');

const ruleBody = (css: string, selector: string): string => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? '';
};

describe('.badge', () => {
  it('keeps the word in --primary-text-color, never a status colour', () => {
    const body = ruleBody(indexCss, '.badge');
    expect(body).toMatch(/color:\s*var\(--primary-text-color\)/);
    for (const grade of ['good', 'fair', 'bad']) {
      expect(ruleBody(indexCss, `.badge-${grade}`)).not.toMatch(/(?:^|[\s;])color:/);
    }
  });

  it('gives each grade its status dot and a 15% status tint', () => {
    for (const grade of ['good', 'fair', 'bad']) {
      const body = ruleBody(indexCss, `.badge-${grade}`);
      expect(body).toMatch(new RegExp(`--badge-dot:\\s*var\\(--status-${grade}\\)`));
      expect(body).toMatch(new RegExp(`color-mix\\(in srgb, var\\(--status-${grade}\\) 15%, transparent\\)`));
    }
    expect(ruleBody(indexCss, '.badge::before')).toMatch(/background-color:\s*var\(--badge-dot\)/);
  });
});

describe('.step-alert title', () => {
  it('adds an optional bold title above a stacked body without touching .step-alert itself', () => {
    expect(ruleBody(messagesCss, '.step-alert-title')).toMatch(/font-weight:\s*600/);
    expect(ruleBody(messagesCss, '.step-alert-content')).toMatch(/flex-direction:\s*column/);
  });
});
