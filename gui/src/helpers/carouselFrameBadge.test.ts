import { readFileSync } from 'fs';
import { join } from 'path';

const css = readFileSync(join(__dirname, '..', 'components', 'components.css'), 'utf8');

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ruleBody = (selector: string): string => {
  const match = css.match(new RegExp(`${escapeRegExp(selector)}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : '';
};

describe('filmstrip frame number is a small corner badge', () => {
  it('.img-water-mark is a small badge pinned to the corner, not a large centred number', () => {
    const body = ruleBody('.img-water-mark');
    expect(body).toMatch(/font-size:\s*11px/);
    expect(body).toMatch(/top:\s*6px/);
    expect(body).toMatch(/right:\s*6px/);
    expect(body).not.toMatch(/font-size:\s*50px/);
    expect(body).not.toMatch(/left:\s*50%/);
    expect(body).not.toMatch(/transform:\s*translate/);
  });

  it('keeps the z-index needed to out-stack the STI carousel thumbnail', () => {
    expect(ruleBody('.img-water-mark')).toMatch(/z-index:\s*2/);
  });
});
