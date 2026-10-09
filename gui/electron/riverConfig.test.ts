jest.mock('electron', () => ({ app: { getPath: () => '/userData' } }));

import * as path from 'path';
import { workspaceFor } from './riverConfig';

describe('workspaceFor', () => {
  it('puts a RIVeR folder inside the picked folder', () => {
    expect(workspaceFor(path.join('/home', 'Documents'))).toBe(path.join('/home', 'Documents', 'RIVeR'));
  });

  it('uses a folder already called RIVeR as the workspace, whatever its case', () => {
    expect(workspaceFor(path.join('/home', 'Documents', 'RIVeR'))).toBe(path.join('/home', 'Documents', 'RIVeR'));
    expect(workspaceFor(path.join('/home', 'River'))).toBe(path.join('/home', 'River'));
  });
});
