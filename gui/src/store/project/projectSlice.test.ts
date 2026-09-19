import reducer, { toggleVideoExtraFields, setDefaultProjectState } from './projectSlice';
import { ProjectState } from './types';

const baseState = (overrides: Partial<ProjectState> = {}): ProjectState =>
  ({
    projectDirectory: '',
    video: {
      data: {
        name: '',
        path: '',
        width: 0,
        height: 0,
        fps: 0,
        duration: 0,
        creation: '',
      },
      parameters: {
        step: 1,
        startTime: 0,
        endTime: 0,
        startFrame: 0,
        endFrame: 0,
        factor: 1,
        lensCorrection: null,
        stabilization: false,
        stabilizationRegions: [],
        committedFactor: 1,
        committedLensCorrection: null,
        committedStabilization: false,
        committedStabilizationRegions: [],
      },
      extraFields: false,
    },
    type: '',
    firstFramePath: '',
    projectDetails: { riverName: '', site: '', unitSistem: 'si', meditionDate: '' },
    stabilizationActiveRegionIndex: null,
    ...overrides,
  }) as ProjectState;

describe('toggleVideoExtraFields', () => {
  it('turns advanced mode on from false', () => {
    const state = reducer(baseState(), toggleVideoExtraFields());
    expect(state.video.extraFields).toBe(true);
  });

  it('turns advanced mode off from true', () => {
    const state = baseState({ video: { ...baseState().video, extraFields: true } });
    expect(reducer(state, toggleVideoExtraFields()).video.extraFields).toBe(false);
  });

  it('does not touch any other video field', () => {
    const state = baseState({
      video: { ...baseState().video, data: { ...baseState().video.data, name: 'clip.mp4' } },
    });
    const next = reducer(state, toggleVideoExtraFields());
    expect(next.video.data.name).toBe('clip.mp4');
  });
});

describe('setDefaultProjectState', () => {
  it('resets extraFields to false along with the rest of video', () => {
    const state = baseState({ video: { ...baseState().video, extraFields: true } });
    expect(reducer(state, setDefaultProjectState()).video.extraFields).toBe(false);
  });
});
