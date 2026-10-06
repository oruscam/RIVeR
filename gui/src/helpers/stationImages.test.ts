import { alignStationImages, skipReasonLabelKey } from './stationImages';

describe('alignStationImages', () => {
  it('puts each image at its station index and leaves gaps empty', () => {
    expect(alignStationImages([1, 2, 4], ['a', 'b', 'd'], 5)).toEqual(['a', 'b', '', 'd', '']);
  });
  it('ignores ids outside the station count', () => {
    expect(alignStationImages([0, 3], ['x', 'c'], 2)).toEqual(['', '']);
  });
  it('is empty when nothing was written', () => {
    expect(alignStationImages([], [], 3)).toEqual(['', '', '']);
  });
});

describe('skipReasonLabelKey', () => {
  it('names the reason', () => {
    expect(skipReasonLabelKey('masked')).toBe('Processing.stationMasked');
    expect(skipReasonLabelKey('dry')).toBe('Processing.stationDry');
    expect(skipReasonLabelKey(null)).toBe('Processing.stationNoResult');
    expect(skipReasonLabelKey(undefined)).toBe('Processing.stationNoResult');
  });
});
