import { canSolve, solveMethodOf, SOLVE_MIN_POINTS } from './ipcamSolve';

describe('solve method', () => {
  test('the limits the buttons had', () => {
    expect(SOLVE_MIN_POINTS).toEqual({ 'direct-solve': 6, 'optimize-solution': 7 });
  });
  test('a stored mode maps to its method', () => {
    expect(solveMethodOf('direct-solve')).toBe('direct-solve');
    expect(solveMethodOf('optimize-solution')).toBe('optimize-solution');
  });
  test.each([undefined, null, '', 'optimize', 'something-else'])(
    'an unknown stored mode (%p) falls back to all points',
    (mode) => {
      expect(solveMethodOf(mode)).toBe('direct-solve');
    }
  );
  test('enough ticked points', () => {
    expect(canSolve('direct-solve', 5)).toBe(false);
    expect(canSolve('direct-solve', 6)).toBe(true);
    expect(canSolve('optimize-solution', 6)).toBe(false);
    expect(canSolve('optimize-solution', 7)).toBe(true);
  });
});
