import { parseCliProgress } from './parseCliProgress';

describe('parseCliProgress', () => {
  it('extracts percentage and remaining time from a tqdm-style line', () => {
    const line = ' 45%|████████████            | 9/20 [00:12<00:15,  1.29it/s]';
    expect(parseCliProgress(line)).toEqual({ percentage: '45%', time: '00:15' });
  });

  it('extracts a 100% completion line', () => {
    const line = '100%|████████████████████████| 20/20 [00:20<00:00,  1.00it/s]';
    expect(parseCliProgress(line)).toEqual({ percentage: '100%', time: '00:00' });
  });

  it('returns empty percentage when the line has no percent marker', () => {
    const line = 'Found 20 images. Calibrating…';
    expect(parseCliProgress(line)).toEqual({ percentage: '', time: '' });
  });

  it('returns empty time when the line has a percentage but no bracketed time', () => {
    const line = '45%|████████████            | 9/20';
    expect(parseCliProgress(line)).toEqual({ percentage: '45%', time: '' });
  });
});
