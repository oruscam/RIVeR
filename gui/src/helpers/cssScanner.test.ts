import {
  blankComments,
  brokenPreludes,
  hasValidException,
  isScaleFontShorthand,
  isScaleFontSize,
  isScaleRadius,
  scaleOffenders,
  scanCss,
} from './cssScanner';

describe('blankComments', () => {
  it('blanks a comment without moving any character', () => {
    const source = 'a { color: red; } /* gone\nstill gone */ b { color: blue; }';
    const out = blankComments(source);
    expect(out.length).toBe(source.length);
    expect(out.split('\n').length).toBe(source.split('\n').length);
    expect(out).not.toContain('gone');
    expect(out).toContain('b { color: blue; }');
  });

  it('does not open a comment on /* inside a quoted string', () => {
    const out = blankComments('a { content: "/*"; } b { color: blue; }');
    expect(out).toContain('b { color: blue; }');
  });

  it('ends a comment at the first */, as a browser does', () => {
    expect(blankComments('/* x */ y */ .z {}')).toContain('y */ .z {}');
  });
});

describe('scanCss', () => {
  it('reads declarations with their selector, property, value and line', () => {
    const { declarations } = scanCss('.a {\n  font-size: 12px;\n  border-radius: 4px\n}');
    expect(declarations).toEqual([
      { selector: '.a', rule: 0, property: 'font-size', value: '12px', line: 2, exception: null },
      { selector: '.a', rule: 0, property: 'border-radius', value: '4px', line: 3, exception: null },
    ]);
  });

  it('collapses a selector list prettier wrapped over several lines', () => {
    const { declarations } = scanCss('.a,\n.b:hover\n{ font-size: 1px; }');
    expect(declarations[0].selector).toBe('.a, .b:hover');
  });

  it('gives a declaration inside @media its innermost rule', () => {
    const { rules, declarations } = scanCss('@media (x) {\n  .a { font-size: 1px; }\n}');
    expect(rules.map((r) => r.prelude)).toEqual(['@media (x)', '.a']);
    expect(declarations[0]).toMatchObject({ selector: '.a', rule: 1, line: 2 });
  });

  it('does not split a value on a ; inside parentheses', () => {
    const { declarations } = scanCss('.a { background: url(data:image/png;base64,AA); font-size: 1px; }');
    expect(declarations.map((d) => d.property)).toEqual(['background', 'font-size']);
  });

  it('captures a scale-exception comment on the declaration line', () => {
    const { declarations } = scanCss(
      '.a {\n  font-size: 11px; /* scale-exception: chart axis text sized to the plot */\n}'
    );
    expect(declarations[0].exception).toBe('chart axis text sized to the plot');
  });

  it('ignores a scale-exception comment on a different line', () => {
    const { declarations } = scanCss('.a {\n  /* scale-exception: three word reason */\n  font-size: 11px;\n}');
    expect(declarations[0].exception).toBeNull();
  });

  it('ignores a top-level @import statement', () => {
    const { rules, declarations } = scanCss("@import url('x.css');\n.a { font-size: 1px; }");
    expect(rules.map((r) => r.prelude)).toEqual(['.a']);
    expect(declarations).toHaveLength(1);
  });
});

describe('brokenPreludes', () => {
  it('finds a rule whose comment closed early and spilled into its selector', () => {
    // The exact shape of the components.css:1235 bug this task fixes.
    const source =
      '/* Results: .x/.technique-row-body*/.technique-eye-btn in\n   graphs.css; Processing: .y\n   ===== */\n.technique-row {\n  padding: 8px;\n}';
    const { rules } = scanCss(source);
    expect(brokenPreludes(rules).map((r) => r.line)).toEqual([1]);
  });

  it('passes ordinary selectors and at-rules', () => {
    const { rules } = scanCss('.a:not(.b) > c::after { x: y; }\n@media (max-width: 9px) { .d { x: y; } }');
    expect(brokenPreludes(rules)).toEqual([]);
  });
});

describe('scale classifiers', () => {
  it.each([
    ['var(--text-body)', true],
    ['var(--text-subtitle) !important', true],
    ['inherit', true],
    ['clamp(var(--text-meta), 1.5vw, var(--text-subtitle))', true],
    ['14px', false],
    ['1.2em', false],
    ['clamp(13px, 1.5vw, 20px)', false],
    ['var(--text-huge)', false],
  ])('font-size %s → %s', (value, expected) => {
    expect(isScaleFontSize(value)).toBe(expected);
  });

  it.each([
    ['var(--radius-xl)', true],
    ['50%', true],
    ['0', true],
    ['0 0 var(--radius-lg) var(--radius-lg)', true],
    ['inherit', true],
    ['20px', false],
    ['var(--border-radius)', false],
    ['0 0 13px 13px', false],
  ])('border-radius %s → %s', (value, expected) => {
    expect(isScaleRadius(value)).toBe(expected);
  });

  it.each([
    ['inherit', true],
    ['700 var(--text-section) / 1.2 var(--font-display)', true],
    ['700 18px/1.2 var(--font-display)', false],
    ['bold 1.2em Inter', false],
  ])('font %s → %s', (value, expected) => {
    expect(isScaleFontShorthand(value)).toBe(expected);
  });

  it('requires an exception reason of at least three words', () => {
    const [short] = scanCss('.a { font-size: 11px; /* scale-exception: chart */ }').declarations;
    const [long] = scanCss('.a { font-size: 11px; /* scale-exception: chart axis text */ }').declarations;
    expect(hasValidException(short)).toBe(false);
    expect(hasValidException(long)).toBe(true);
  });

  it('scaleOffenders returns only governed, off-scale, unexcused declarations', () => {
    const { declarations } = scanCss(
      [
        '.ok { font-size: var(--text-body); border-radius: var(--radius-md); color: red; }',
        '.bad { font-size: 15px; border-top-left-radius: 3px; }',
        '.excused { font-size: 11px; /* scale-exception: chart axis text */ }',
      ].join('\n')
    );
    expect(scaleOffenders(declarations).map((d) => `${d.selector} ${d.property}`)).toEqual([
      '.bad font-size',
      '.bad border-top-left-radius',
    ]);
  });
});
