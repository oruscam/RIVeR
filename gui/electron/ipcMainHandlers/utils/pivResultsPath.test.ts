import * as path from 'path';
import { pivResultsPath } from './pivResultsPath';

describe('pivResultsPath', () => {
  it("reads the project's own piv_results.json, whatever folder settings.json points at", () => {
    // A run finished after another project was loaded once wrote that other
    // project's path here, and its vectors were drawn on this project's frames.
    const settings = { piv_results: '/River/P1060716/20260924T0918/piv_results.json' };
    expect(pivResultsPath('/River/MVI_1923/20260924T1725', settings)).toBe(
      path.join('/River/MVI_1923/20260924T1725', 'piv_results.json')
    );
  });

  it('is undefined when settings.json records no results', () => {
    expect(pivResultsPath('/River/MVI_1923/20260924T1725', {})).toBeUndefined();
  });
});
