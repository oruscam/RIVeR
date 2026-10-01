import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * The spacing/radius/motion scale Phase 3 will build components against.
 * These are the same across all three themes, so they live in one bare
 * :root block instead of being repeated in each [data-theme] block.
 */
const css = readFileSync(join(__dirname, '..', 'index.css'), 'utf8');

const rootBlock = (): string => {
  const match = css.match(/(?:^|\n):root\s*\{([^}]*)\}/);
  if (!match) throw new Error('No bare :root block found in index.css');
  return match[1];
};

const token = (name: string): string | undefined => {
  const match = rootBlock().match(new RegExp(`${name}\\s*:\\s*([^;]+);`));
  return match?.[1].trim();
};

describe('scale tokens', () => {
  it('declares a bare :root block, separate from the [data-theme] blocks', () => {
    expect(() => rootBlock()).not.toThrow();
  });

  it('does not redeclare any token a [data-theme] block already owns', () => {
    const themedTokens = [...css.matchAll(/\[data-theme="[a-z]+"\]\s*\{([^}]*)\}/g)].flatMap((m) =>
      [...m[1].matchAll(/(--[a-z0-9-]+)\s*:/g)].map((t) => t[1])
    );
    const rootTokens = [...rootBlock().matchAll(/(--[a-z0-9-]+)\s*:/g)].map((t) => t[1]);
    const overlap = rootTokens.filter((t) => themedTokens.includes(t));
    expect(overlap).toEqual([]);
  });

  describe.each([
    ['--radius-sm', '4px'],
    ['--radius-md', '8px'],
    ['--radius-lg', '12px'],
    ['--radius-xl', '20px'],
    ['--radius-full', '999px'],
    ['--space-1', '4px'],
    ['--space-2', '8px'],
    ['--space-3', '12px'],
    ['--space-4', '16px'],
    ['--space-5', '24px'],
    ['--space-6', '32px'],
    ['--space-7', '48px'],
    ['--motion-fast', '120ms'],
    ['--motion-base', '200ms'],
    ['--motion-slow', '320ms'],
    ['--motion-ease', 'cubic-bezier(.2,0,0,1)'],
  ])('%s', (name, expected) => {
    it(`is ${expected}`, () => {
      expect(token(name)).toBe(expected);
    });
  });
});
