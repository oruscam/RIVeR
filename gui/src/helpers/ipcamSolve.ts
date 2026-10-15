import { ErrorGrade } from './ipcamErrorGrade';

/** The backend's two solve modes: every ticked point, or the subset that minimises the error. */
export type SolveMethod = 'direct-solve' | 'optimize-solution';

export const SOLVE_MIN_POINTS: Record<SolveMethod, number> = { 'direct-solve': 6, 'optimize-solution': 7 };

/** The method a stored solution was made with; anything unknown reads as all points. */
export const solveMethodOf = (mode: string | undefined | null): SolveMethod =>
  mode === 'optimize-solution' ? 'optimize-solution' : 'direct-solve';

export const canSolve = (method: SolveMethod, ticked: number) => ticked >= SOLVE_MIN_POINTS[method];

/**
 * "Untick the worst points and solve again" only helps an All points solve: Optimized solves on
 * every placed point and picks its own subset, whatever is ticked.
 */
export const showUntickHint = (mode: string | undefined | null, grade: ErrorGrade | null) =>
  solveMethodOf(mode) === 'direct-solve' && (grade === 'fair' || grade === 'bad');
