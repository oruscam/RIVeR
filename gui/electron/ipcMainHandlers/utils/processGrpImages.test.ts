import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { processGrpImages } from './processGrpImages';

let project: string;
let source: string;

/** A backend that copies the source images into the output folder. */
const copyingCli = () =>
  jest.fn(async (options: (string | number)[]) => {
    const [, from, to] = options.map(String);
    fs.mkdirSync(to, { recursive: true });
    fs.readdirSync(from).forEach((name) => fs.copyFileSync(path.join(from, name), path.join(to, name)));
    return { data: {}, error: {} };
  });

beforeEach(() => {
  project = fs.mkdtempSync(path.join(os.tmpdir(), 'grp-'));
  source = path.join(project, 'user_images');
  fs.mkdirSync(source);
  fs.writeFileSync(path.join(source, 'b.jpg'), 'b');
  fs.writeFileSync(path.join(source, 'a.jpg'), 'a');
});

afterEach(() => fs.rmSync(project, { recursive: true, force: true }));

test('without lens correction or resize, uses the source images as they are', async () => {
  const riverCli = copyingCli();
  const settings: Record<string, any> = { lens_correction: null, video_range: { factor: 1 } };

  const result = await processGrpImages(source, project, settings, riverCli);

  expect(riverCli).not.toHaveBeenCalled();
  expect(result.imagesPath).toBe(source);
  expect(result.files).toEqual([path.join(source, 'a.jpg'), path.join(source, 'b.jpg')]);
  expect(settings.rectification_3d_images).toBe(source);
  expect(settings.rectification_3d_images_processed).toBeNull();
});

test('with lens correction, processes into the project with the frames profile and factor', async () => {
  const riverCli = copyingCli();
  const settings: Record<string, any> = { lens_correction: '/profiles/cam.json', video_range: { factor: 0.5 } };
  const output = path.join(project, 'grp_images');

  const result = await processGrpImages(source, project, settings, riverCli);

  expect(riverCli.mock.calls[0][0]).toEqual([
    'process-images',
    source,
    output,
    '--resize-factor',
    0.5,
    '--profile-path',
    '/profiles/cam.json',
  ]);
  expect(result.imagesPath).toBe(output);
  expect(result.files).toEqual([path.join(output, 'a.jpg'), path.join(output, 'b.jpg')]);
  expect(settings.rectification_3d_images).toBe(source);
  expect(settings.rectification_3d_images_processed).toBe(output);
});

test('a backend error is returned and leaves no processed folder', async () => {
  const riverCli = jest.fn(async () => ({ data: {}, error: { message: 'profile does not match' } }));
  const settings: Record<string, any> = { lens_correction: '/profiles/cam.json' };

  const result = await processGrpImages(source, project, settings, riverCli);

  expect(result.error).toBe('profile does not match');
  expect(fs.existsSync(path.join(project, 'grp_images'))).toBe(false);
  expect(settings.rectification_3d_images_processed).toBeUndefined();
});
