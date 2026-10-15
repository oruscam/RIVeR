import { readFileSync } from 'fs';
import { join } from 'path';
import { canSwapBanks, swapEnds } from './swapSectionBanks';

const SRC = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(SRC, rel), 'utf8');

describe('swapEnds', () => {
  const left = { x: 120.5, y: 40.25 };
  const right = { x: 900, y: 610.75 };

  it('exchanges the two ends and leaves their positions untouched', () => {
    expect(swapEnds([left, right])).toEqual([right, left]);
  });

  it('returns new points, so the stored ones are never mutated', () => {
    const points = [left, right];
    const swapped = swapEnds(points);
    expect(swapped).not.toBe(points);
    expect(swapped[0]).not.toBe(right);
    expect(points).toEqual([left, right]);
  });

  it('swapping twice gives the original line back', () => {
    expect(swapEnds(swapEnds([left, right]))).toEqual([left, right]);
  });
});

describe('canSwapBanks', () => {
  it('needs a drawn line: two distinct ends', () => {
    expect(
      canSwapBanks([
        { x: 1, y: 2 },
        { x: 3, y: 4 },
      ])
    ).toBe(true);
    expect(
      canSwapBanks([
        { x: 0, y: 0 },
        { x: 0, y: 0 },
      ])
    ).toBe(false);
    expect(canSwapBanks([])).toBe(false);
  });
});

describe('the swap sits in the section header, as quiet as its neighbours', () => {
  const header = read('components/CrossSections/Sections.tsx');

  it('is a small icon button with a tooltip, shown only where sections can be edited', () => {
    expect(header).toMatch(/className="ibtn ibtn-sm"[\s\S]{0,400}CrossSections\.swapBanks/);
    expect(header).toMatch(/Icons\.Swap\('currentColor'\)/);
  });

  it('clears results like a moved pin does', () => {
    const hook = read('hooks/useSectionSlice.ts');
    const body = hook.slice(hook.indexOf('const onSwapBanks'), hook.indexOf('const onSetActiveSection'));
    expect(body).toMatch(/dispatch\(clearResults\(\)\)/);
    expect(body).toMatch(/dispatch\(setHasChanged\(\{ value: true \}\)\)/);
  });
});
