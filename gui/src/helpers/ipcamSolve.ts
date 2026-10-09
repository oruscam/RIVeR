/** The backend's two solve modes: every ticked point, or the subset that minimises the error. */
export type SolveMethod = 'direct-solve' | 'optimize-solution';

export const SOLVE_MIN_POINTS: Record<SolveMethod, number> = { 'direct-solve': 6, 'optimize-solution': 7 };

/** The method a stored solution was made with; anything unknown reads as all points. */
export const solveMethodOf = (mode: string | undefined | null): SolveMethod =>
  mode === 'optimize-solution' ? 'optimize-solution' : 'direct-solve';

export const canSolve = (method: SolveMethod, ticked: number) => ticked >= SOLVE_MIN_POINTS[method];
