import { resolveProjectFolder } from './resolveProjectFolder';

describe('resolveProjectFolder', () => {
  it('returns args.directory without calling the picker', async () => {
    const pick = jest.fn(async () => '/picked');
    await expect(resolveProjectFolder({ directory: '/recent/A' }, pick)).resolves.toBe('/recent/A');
    expect(pick).not.toHaveBeenCalled();
  });

  it.each([[undefined], [null], [{}], [{ directory: '' }], [{ directory: '   ' }], [{ directory: 42 }], ['/x']])(
    'falls back to the picker for %p',
    async (args) => {
      const pick = jest.fn(async () => '/picked');
      await expect(resolveProjectFolder(args, pick)).resolves.toBe('/picked');
      expect(pick).toHaveBeenCalledTimes(1);
    }
  );

  it('passes a cancelled pick through as null', async () => {
    await expect(resolveProjectFolder(undefined, async () => null)).resolves.toBeNull();
  });
});
