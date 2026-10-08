import { readFileSync } from 'fs';
import { join } from 'path';
import { scanCss } from './cssScanner';

const SRC = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(SRC, rel), 'utf8');
const C = 'components/Forms/Components/';

describe('Video Range panel is on the row grammar', () => {
  const form = read('components/Forms/FormVideo.tsx');

  it('has none of the legacy pill, field or button classes', () => {
    expect(form).not.toMatch(/read-only|input-container-2|input-field|form-button|btn-lg|form-video-fields/);
  });

  it('Start, End, Step and the frames interval are rows with 120px fields on one right edge', () => {
    expect(form).toMatch(/className="panel-section"/);
    expect(form.match(/className="field field-coord"/g)).toHaveLength(4);
    expect(form.match(/className="field-row field-row-top"/g)).toHaveLength(4);
  });

  it('Start and End keep their set-to-playhead buttons, as labelled icon buttons', () => {
    for (const id of ['start-button', 'end-button']) {
      const button = form.match(new RegExp(`<button[^>]*id="${id}"[^>]*>`, 's'))?.[0] ?? '';
      expect(button).toMatch(/className="ibtn ibtn-sm"/);
      expect(button).toMatch(/aria-label=/);
      expect(button).toMatch(/title=/);
      expect(button).toMatch(/onClick=\{handleClick\}/);
    }
    expect(read('components/CustomIcons/Icons.tsx')).toMatch(/Target:/);
  });

  it('the frame count and spacing read as one muted summary line', () => {
    expect(form).toMatch(/className="field-readonly panel-summary"/);
    expect(form).toMatch(/VideoRange\.framesSummary/);
  });
});

describe('the set-to-playhead buttons write to their own field', () => {
  const form = read('components/Forms/FormVideo.tsx');
  const handler = form.slice(form.indexOf('const handleClick'), form.indexOf('const handleBlur'));

  it('reads the button, not the icon inside it (event.target is the svg and has no id)', () => {
    expect(handler).toMatch(/event\.currentTarget\.id/);
    expect(handler).not.toMatch(/event\.target/);
  });

  it('only start-button writes start, only end-button writes end', () => {
    expect(handler).toMatch(/id === 'start-button'/);
    expect(handler).toMatch(/id === 'end-button'/);
  });
});

describe('Source video info is read-only text under a quiet caption (rules 3, 7)', () => {
  const meta = read(C + 'VideoMetadata.tsx');
  it('uses the shared row grammar, not the legacy info rows', () => {
    expect(meta).not.toMatch(/form-video-extra-info/);
    expect(meta).toMatch(/<p className="panel-group">/);
    expect(meta).toMatch(/className="field-readonly"/);
    expect(meta).toMatch(/className="field-row"/);
    for (const key of ['fileName', 'totalLength', 'resolution']) expect(meta).toContain(`ExtraInfo.${key}`);
    expect(meta).toContain("['FPS'");
  });
});

describe('Stabilization is offered for oblique too, never for a fixed ipcam', () => {
  const gated = [
    ['components/Forms/FormVideo.tsx', /type !== 'ipcam' && <StabilizationRegions/],
    ['pages/VideoRange.tsx', /stabilization && type !== 'ipcam'/],
    ['hooks/useProjectSlice.ts', /type !== 'ipcam' && stabilization && stabilizationRegions\.length >= 2/],
  ] as const;

  it.each(gated)('%s', (file, pattern) => {
    expect(read(file)).toMatch(pattern);
  });

  it('no stabilization gate still says uav-only', () => {
    for (const file of ['components/Forms/FormVideo.tsx', 'pages/VideoRange.tsx', 'hooks/useProjectSlice.ts']) {
      expect(read(file)).not.toMatch(
        /type === 'uav' (&&|\?)[^\n]*(stabiliz|Stabiliz)|stabilization && type === 'uav'/
      );
    }
  });
});

describe('Regions look and work like masks', () => {
  const stab = read(C + 'StabilizationRegions.tsx');
  const list = read(C + 'RegionList.tsx');

  it('the switch is a panel row with the compact switch; its list nests under it (rule 6)', () => {
    expect(stab).not.toMatch(/switch-container|field-title|lens-correction-section/);
    expect(stab).toMatch(/className="field-row field-row-top"/);
    expect(stab).toMatch(/className="switch switch-sm"/);
    expect(stab).toMatch(/className="panel-nested"/);
  });

  it('rows are the mask row, under a group caption, with the quiet add row', () => {
    expect(list).toMatch(/className="list-row list-row-field"/);
    expect(list).toMatch(/<p className="panel-group">/);
    expect(list).toMatch(/btn btn-sm btn-tertiary panel-add/);
    expect(list).not.toMatch(/chip/);
  });

  it('while a region is being edited the add row says "Done editing" and ends the edit', () => {
    expect(list).toMatch(/doneEditingRegion/);
    expect(stab).toMatch(/stabilizationActiveRegionIndex !== null/);
    expect(stab).toMatch(/onSetStabilizationActiveRegionIndex\(null\)/);
  });

  it('says why Next is blocked, before the user hits it', () => {
    expect(list).toMatch(/minRegionsHint/);
  });
});

describe('Video Range CSS', () => {
  const { rules, declarations } = scanCss(read('components/Forms/form.css'));
  const decl = (selector: string, property: string) => {
    const rule = rules.filter((r) => r.prelude === selector).pop();
    return rule && declarations.filter((d) => d.rule === rule.index && d.property === property).pop()?.value;
  };

  it('canary', () => expect(decl('.form-container', 'display')).toBe('flex'));
  it('a field with its action button lines up on the right edge', () => {
    expect(decl('.field-with-action', 'display')).toBe('inline-flex');
    expect(decl('.field-with-action', 'gap')).toBe('var(--space-2)');
  });
  it('nested content sits 16px in, like a dependent row', () => {
    expect(decl('.panel-nested', 'padding-left')).toBe('var(--space-4)');
  });
  it('the summary is muted text at the row inset', () => {
    expect(decl('.panel-summary', 'padding')).toBe('0 var(--space-2)');
  });
});
