import { WizardButtons } from '../components/WizzardButtons.js';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { useWizard } from 'react-use-wizard';
import { useProjectSlice } from '../hooks/index.js';
import { Icon } from '../components/Icon.js';
import { Icons } from '../components/CustomIcons/Icons';
import { useRef, useState } from 'react';
import { OperationCanceledError, UserSelectionError } from '../errors/errors.js';
import { drone, ipcam, oblique } from '../assets/icons/icons';
import './pages.css';
import { formatNumberTo2Decimals, handleDragLeave, handleDragOver } from '../helpers/index.js';
import { fpsFromInterval, parseInterval } from '../../commons/framesSource';

/** What the project starts from: one video file, or a folder of already-extracted frames. */
type Source = {
  kind: 'video' | 'frames';
  name: string;
  path: string;
  type: string;
  frames?: { count: number; width: number; height: number };
};

const footageTypes = [
  { id: 'uav', icon: drone, label: 'Drone', description: 'Top-down view from above' },
  { id: 'oblique', icon: oblique, label: 'Oblique', description: 'Tripod or camera on the bank' },
  { id: 'ipcam', icon: ipcam, label: 'Fixed camera', description: 'IP or CCTV station' },
];

export const FootageMode = () => {
  const { handleSubmit } = useForm();
  const { onInitProject, onGetVideo, onGetFramesFolder, onInspectFramesFolder } = useProjectSlice();
  const { nextStep, previousStep } = useWizard();
  const formId = 'form-step-2';
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;

  const [error, setError] = useState<string>('');
  const [source, setSource] = useState<Source | null>(null);
  // The interval is kept as typed: "33," must stay editable on the way to "33,3".
  const [intervalText, setIntervalText] = useState<string>('');
  const [reading, setReading] = useState<boolean>(false);
  // Counts every change of source, so a folder that finishes reading after one is ignored.
  const sourceRequest = useRef(0);

  const [dragOver, setDragOver] = useState<string | null>(null);
  const [footageType, setFootageType] = useState<string | null>(null);

  const intervalMs = parseInterval(intervalText);
  const ready = source !== null && (source.kind === 'video' || intervalMs !== null);

  const flashError = (message: string) => {
    setError(message);
    setTimeout(() => setError(''), 3000);
  };

  const onSubmit = async () => {
    if (!source || !ready) return;
    try {
      const currentUnitSystem = localStorage.getItem('unitSystem') || 'si';
      await onInitProject(
        {
          name: source.name,
          path: source.path,
          type: source.type,
          frames:
            source.kind === 'frames' && source.frames && intervalMs !== null
              ? { ...source.frames, intervalMs }
              : undefined,
        },
        currentLanguage,
        currentUnitSystem
      );
      nextStep();
    } catch (error) {
      if (error instanceof OperationCanceledError) previousStep();
    }
  };

  /** Another source, or none, was chosen: whatever folder is still being read no longer counts. */
  const dropPendingFolder = () => {
    sourceRequest.current++;
    setReading(false);
  };

  /** Checks a folder with the backend and, if it holds a usable sequence, makes it the source. */
  const pickFramesFolder = async (path: string, name: string, type: string) => {
    const request = ++sourceRequest.current;
    setSource(null);
    setIntervalText('');
    setReading(true);
    try {
      const result = await onInspectFramesFolder(path);
      if (request !== sourceRequest.current) return;
      if ('error' in result) {
        flashError(t(`Step-2.Errors.${result.error}`, { defaultValue: t('Step-2.Errors.unreadableFolder') }));
        return;
      }
      setSource({
        kind: 'frames',
        name,
        path,
        type,
        frames: { count: result.count, width: result.width, height: result.height },
      });
    } catch {
      if (request === sourceRequest.current) flashError(t('Step-2.Errors.unreadableFolder'));
    } finally {
      // A newer folder is still being read; a newer video or Change type already cleared this.
      if (request === sourceRequest.current) setReading(false);
    }
  };

  const onClickBrowseVideo = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    try {
      const { path, name } = await onGetVideo();
      dropPendingFolder();
      setIntervalText('');
      setSource({ kind: 'video', name, path, type: footageType as string });
    } catch (error) {
      if (error instanceof UserSelectionError) {
        setSource(null);
        flashError(t('Step-2.pleaseSelectVideo', { defaultValue: 'Commons.randomError' }));
      }
    }
  };

  const onClickBrowseFrames = async () => {
    const folder = await onGetFramesFolder();
    if (folder) await pickFramesFolder(folder.path, folder.name, footageType as string);
  };

  const handleDrop = (type: string) => (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(null);
    const files = event.dataTransfer.files;
    // Must be read before any await: the drag data is gone once the handler returns.
    const isDirectory = event.dataTransfer.items?.[0]?.webkitGetAsEntry?.()?.isDirectory === true;

    setFootageType(type);

    if (files.length === 0) return;
    const file = files[0];

    if (isDirectory) {
      void pickFramesFolder(window.webUtils.getPathForFile(file), file.name, type);
    } else if (file.type.includes('video')) {
      dropPendingFolder();
      setIntervalText('');
      setSource({ kind: 'video', name: file.name, path: window.webUtils.getPathForFile(file), type });
    } else {
      dropPendingFolder();
      setSource(null);
      flashError(
        file.type.startsWith('image/')
          ? t('Step-2.Errors.dropFolder')
          : t('Step-2.invalidFileType', { defaultValue: 'Commons.randomError' })
      );
    }
  };

  const onChangeType = () => {
    dropPendingFolder();
    setSource(null);
    setIntervalText('');
    setFootageType(null);
  };

  return (
    <div className="default-app-container">
      <h2 className="step-2-title">{t('Step-2.title')}</h2>
      <form className="file-upload-container" onSubmit={handleSubmit(onSubmit)} id={formId}>
        <div className="type-footage-container">
          {footageTypes.map(({ id, icon, label, description }) => (
            <div
              key={id}
              className={`footage-button-container ${dragOver === id ? `drag-over-${id}` : ''} ${footageType === id ? 'selected-footage-type' : ''}`}
              role="button"
              tabIndex={0}
              aria-pressed={footageType === id}
              aria-label={t('Step-2.footageType.' + id, { defaultValue: label })}
              onDragOver={(event) => handleDragOver(event, setDragOver, id)}
              onDragLeave={(event) => handleDragLeave(event, setDragOver, true)}
              onDrop={handleDrop(id)}
              onClick={() => setFootageType(id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setFootageType(id);
                }
              }}
              id={id}
            >
              {footageType === id && (
                <span className="footage-check-badge" aria-hidden="true">
                  {Icons.Check('var(--on-accent)')}
                </span>
              )}
              <Icon path={icon} />
              <b className="footage-type-name">{t('Step-2.footageType.' + id, { defaultValue: label })}</b>
              <small className="footage-type-description">
                {t('Step-2.footageType.' + id + 'Description', { defaultValue: description })}
              </small>
            </div>
          ))}
        </div>
        <div className={`browse-video-container${footageType || source ? ' visible' : ''}`}>
          <div className="browse-video-header">
            {footageType !== null ? (
              <>
                <p>{footageType && source === null ? t(`Step-2.addYourFootage`) : ''}</p>
                <p onClick={() => onChangeType()}>{footageType ? t(`Step-2.changeType`) : undefined} </p>
              </>
            ) : (
              <></>
            )}
          </div>
          <div
            className={`browse-video-drop-area${dragOver === 'drop-area' ? ' drag-over' : ''}`}
            onDragOver={(event) => handleDragOver(event, setDragOver, 'drop-area')}
            onDragLeave={(event) => handleDragLeave(event, setDragOver, true)}
            onDrop={handleDrop(footageType as string)}
            aria-busy={reading || undefined}
            id="drop-area"
          >
            {reading && <p>{t('Step-2.readingFolder')}</p>}
            {!reading && source === null && <p> {t('Step-2.dragAndDrop')}</p>}
            {!reading && source?.kind === 'video' && <p>{source.name}</p>}

            {!reading && source?.kind === 'frames' && source.frames && (
              <div className="frames-source">
                <p className="frames-source-name">
                  <span>{source.name}</span>
                  <span className="field-readonly">{t('Step-2.framesSummary', source.frames)}</span>
                </p>
                <div className="field-row">
                  <label className="field-row-label" htmlFor="frames-interval">
                    {t('Step-2.timeBetweenFrames')}
                  </label>
                  <span className="field-with-unit">
                    <input
                      id="frames-interval"
                      className="field field-coord"
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      autoFocus
                      value={intervalText}
                      onChange={(event) => setIntervalText(event.target.value)}
                    />
                    <span className="field-unit">ms</span>
                  </span>
                  <span className="field-readonly frames-source-fps">
                    {intervalMs !== null ? `${formatNumberTo2Decimals(fpsFromInterval(intervalMs))} fps` : ''}
                  </span>
                </div>
              </div>
            )}

            {source?.kind !== 'frames' && !reading && (
              <>
                <button
                  className="btn btn-lg btn-secondary"
                  data-complete={!!source}
                  onClick={onClickBrowseVideo}
                  type="button"
                >
                  {' '}
                  {t('Step-2.openFolders')}{' '}
                </button>
                {source === null && (
                  <button className="browse-frames-link" onClick={onClickBrowseFrames} type="button">
                    {t('Step-2.chooseFramesFolder')}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </form>
      {error && <p className="file-name mt-2">{error}</p>}
      <WizardButtons canFollow={source === null || ready} formId={formId} />
    </div>
  );
};
