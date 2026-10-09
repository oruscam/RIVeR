import { readFileSync } from 'fs';
import { join } from 'path';
import { measureImageAspect } from './measureImageAspect';

const css = readFileSync(join(__dirname, '..', 'components', 'components.css'), 'utf8');

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ruleBody = (selector: string): string => {
  const match = css.match(new RegExp(`${escapeRegExp(selector)}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : '';
};

describe('skipped-station placeholder tile', () => {
  it('stays inside the strip row and keeps room for its label', () => {
    const body = ruleBody('.img-carousel-empty');
    expect(body).toMatch(/max-height:\s*100%/);
    expect(body).toMatch(/min-height:/);
  });

  it('undims through a selector that out-ranks the strip dimming rule', () => {
    // The dimming rule has three class-level parts; this one has four.
    const body = ruleBody('.img-carousel.img-carousel-empty:not(.img-carousel-active):not(.img-carousel-second)');
    expect(body).toMatch(/filter:\s*none/);
  });

  it('quiets the label of an unselected placeholder from the chrome ink', () => {
    const body = ruleBody('.img-carousel.img-carousel-empty:not(.img-carousel-active):not(.img-carousel-second)');
    expect(body).toMatch(/color:\s*color-mix\(in srgb, var\(--canvas-chrome-ink\)/);
  });
});

describe('measureImageAspect', () => {
  const OriginalImage = (global as { Image?: unknown }).Image;
  let behaviour: 'load' | 'error' = 'load';
  let size = { w: 816, h: 101 };

  beforeEach(() => {
    (global as { Image?: unknown }).Image = class {
      naturalWidth = 0;
      naturalHeight = 0;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_v: string) {
        setTimeout(() => {
          if (behaviour === 'error') return this.onerror?.();
          this.naturalWidth = size.w;
          this.naturalHeight = size.h;
          this.onload?.();
        }, 0);
      }
    };
  });

  afterEach(() => {
    (global as { Image?: unknown }).Image = OriginalImage;
    behaviour = 'load';
    size = { w: 816, h: 101 };
  });

  it('resolves width / height of the loaded image', async () => {
    await expect(measureImageAspect('sti_1.png')).resolves.toBeCloseTo(816 / 101);
  });

  it('resolves null for no source, a failed load or a zero-height image', async () => {
    await expect(measureImageAspect('')).resolves.toBeNull();
    behaviour = 'error';
    await expect(measureImageAspect('missing.png')).resolves.toBeNull();
    behaviour = 'load';
    size = { w: 10, h: 0 };
    await expect(measureImageAspect('flat.png')).resolves.toBeNull();
  });
});
