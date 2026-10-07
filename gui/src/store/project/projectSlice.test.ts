import reducer, { toggleVideoExtraFields, setDefaultProjectState } from './projectSlice';
import {
  setProjectIssues,
  setVideoMismatch,
  resolveVideoMissing,
  resolveBathymetry,
  resolveIpcamImages,
  resolveSectionBathymetry,
} from './projectSlice';
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
    issues: { videoMissing: false, missingInputs: [], videoMismatch: null },
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

describe('project issues', () => {
  const issues = {
    videoMissing: true,
    missingInputs: [
      { kind: 'bathymetry' as const, section: 'CS_default_1', path: '/gone/bathy.csv' },
      { kind: 'bathymetry' as const, section: 'CS_default_2', path: '/gone/bathy.csv' },
      { kind: 'bathymetry' as const, section: 'CS_default_3', path: '/gone/other.csv' },
      { kind: 'ipcamImages' as const, path: '/gone/images' },
    ],
  };

  it('stores what load-project reported and clears an old mismatch', () => {
    const withMismatch = baseState({
      issues: {
        videoMissing: true,
        missingInputs: [],
        videoMismatch: { expected: { width: 1, height: 1, fps: 1 }, found: { width: 2, height: 2, fps: 2 } },
      },
    });
    const state = reducer(withMismatch, setProjectIssues(issues));
    expect(state.issues).toEqual({ ...issues, videoMismatch: null });
  });

  it('clears the video issue and its mismatch once located', () => {
    let state = reducer(baseState(), setProjectIssues(issues));
    state = reducer(
      state,
      setVideoMismatch({ expected: { width: 4096, height: 2160, fps: 30 }, found: { width: 1920, height: 1080, fps: 25 } })
    );
    state = reducer(state, resolveVideoMissing());
    expect(state.issues.videoMissing).toBe(false);
    expect(state.issues.videoMismatch).toBeNull();
  });

  it('clears every section that shared the located bathymetry, and only those', () => {
    const state = reducer(reducer(baseState(), setProjectIssues(issues)), resolveBathymetry('/gone/bathy.csv'));
    expect(state.issues.missingInputs).toEqual([
      { kind: 'bathymetry', section: 'CS_default_3', path: '/gone/other.csv' },
      { kind: 'ipcamImages', path: '/gone/images' },
    ]);
  });

  it("clears one section's bathymetry issue (new import or deleted section), not others sharing the file", () => {
    const state = reducer(reducer(baseState(), setProjectIssues(issues)), resolveSectionBathymetry('CS_default_1'));
    expect(state.issues.missingInputs).toEqual(
      issues.missingInputs.filter((input) => !(input.kind === 'bathymetry' && input.section === 'CS_default_1'))
    );
    expect(state.issues.missingInputs.some((input) => input.kind === 'bathymetry')).toBe(true);
  });

  it('clears the image-folder issue', () => {
    const state = reducer(reducer(baseState(), setProjectIssues(issues)), resolveIpcamImages());
    expect(state.issues.missingInputs.some((input) => input.kind === 'ipcamImages')).toBe(false);
  });

  it('starts with no issues after setDefaultProjectState', () => {
    const state = reducer(reducer(baseState(), setProjectIssues(issues)), setDefaultProjectState());
    expect(state.issues).toEqual({ videoMissing: false, missingInputs: [], videoMismatch: null });
  });
});
