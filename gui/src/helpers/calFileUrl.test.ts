import { toCalFileUrl } from './calFileUrl';

describe('toCalFileUrl', () => {
  it('prefixes a POSIX path with the cal-file scheme', () => {
    expect(toCalFileUrl('/Users/a/board/img_01.jpg')).toBe('cal-file:///Users/a/board/img_01.jpg');
  });

  it('turns a Windows path into forward slashes with a leading slash before the drive letter', () => {
    expect(toCalFileUrl('C:\\Users\\a\\img_01.jpg')).toBe('cal-file:///C:/Users/a/img_01.jpg');
  });
});
