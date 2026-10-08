import { useEffect, useState } from 'react';
import { FieldValues, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useUiSlice } from '../../hooks/useUiSlice';
import { useWizard } from 'react-use-wizard';
import { getFrameValidationRules, getValidationRules } from '../../helpers/validationRules';
import { useProjectSlice, useProjectIssues } from '../../hooks';
import './form.css';
import { formatNumberTo2Decimals, formatTime } from '../../helpers';
import { identifyTimeFormat, parseTime } from '../../helpers/formatTime';
import { fpsFromInterval, parseInterval, selectedFrameCount } from '../../../commons/framesSource';
import { VideoMetadata, FramesResolution, LensCorrection, StabilizationRegions } from './Components/index';
import { FieldError } from '../index';
import { Icons } from '../CustomIcons/Icons';

export const FormVideo = ({
  duration,
  extraFields,
  currentFrame = 0,
}: {
  duration: number;
  extraFields: boolean;
  currentFrame?: number;
}) => {
  const { onSetVideoParameters, video: videoData, type } = useProjectSlice();
  const { startTime, endTime, step } = videoData.parameters;
  const { startFrame, endFrame } = videoData.parameters;

  const { fps } = videoData.data;
  const { source, frameCount = 0, intervalMs } = videoData.data;
  const frames = source === 'frames';
  const { videoMissing } = useProjectIssues('video');

  const { handleSubmit, register, setValue, getValues, watch } = useForm({
    defaultValues: frames
      ? {
          // 1-based frame numbers; endFrame is 0 until the first extraction.
          start: String(startFrame + 1),
          end: String(endFrame !== 0 ? endFrame : frameCount),
          step: step,
          interval: intervalMs ? String(intervalMs) : '',
        }
      : {
          start: formatTime(startTime, 'mm:ss'),
          end: formatTime(endTime !== 0 ? endTime : duration, 'mm:ss'),
          step: step,
          interval: '',
        },
  });

  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const { t } = useTranslation();
  const { nextStep } = useWizard();
  const { onSetFieldError, onClearFieldError, onAddStepAlert, onClearStepAlert } = useUiSlice();

  const watchStep = watch('step');
  const watchStartTime = watch('start');
  const watchEndTime = watch('end');
  const watchInterval = watch('interval');

  useEffect(() => {
    onClearFieldError('step');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchStep]);

  const frameRules = getFrameValidationRules(t, getValues, frameCount);
  const validationRules = frames ? frameRules : getValidationRules(t, getValues, duration);

  // What the user is typing right now, so the summary follows an edited interval.
  const typedInterval = parseInterval(String(watchInterval ?? ''));
  const timeBetweenFrames = frames
    ? ((typedInterval ?? 0) * watchStep).toFixed(2)
    : ((1 / (fps || 0)) * watchStep * 1000).toFixed(2);

  const numberOfFrames = frames
    ? selectedFrameCount(Number(watchStartTime) - 1, Number(watchEndTime), Number(watchStep))
    : Math.floor(((parseTime(watchEndTime) - parseTime(watchStartTime)) * fps) / watchStep);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    // currentTarget is the button itself; the click's own target is the icon inside it, which has no id.
    const id = event.currentTarget.id;
    const field = id === 'start-button' ? 'start' : id === 'end-button' ? 'end' : null;
    if (field === null) return;
    if (frames) {
      // The player's index is 0-based; the form shows 1-based frame numbers.
      setValue(field, String(currentFrame + 1), { shouldValidate: true });
      return;
    }
    if (video === null) return;
    setValue(field, formatTime(video.currentTime, 'mm:ss'), { shouldValidate: true });
  };

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    if (frames) {
      // Frame numbers are validated as typed; only a video's times are reformatted to mm:ss.
      onClearFieldError(event.target.id);
      return;
    }
    let value = event.target.value;
    const id = event.target.id;
    const timeformat = identifyTimeFormat(value);

    onClearFieldError(id);

    if (timeformat === 'mm:ss') {
      setValue(id as 'start' | 'end' | 'step', value, { shouldValidate: true });
    } else if (timeformat === 'seconds') {
      value = formatTime(parseFloat(value), 'mm:ss');
      setValue(id as 'start' | 'end' | 'step', value, { shouldValidate: true });
    } else {
      setValue(id as 'start' | 'end' | 'step', id === 'start' ? '00:00' : formatTime(duration, 'mm:ss'), {
        shouldValidate: false,
      });
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const id = (event.target as HTMLInputElement).id;

      if (id === 'step') return;
      if (frames) {
        onClearFieldError(id);
        document.getElementById(id === 'start' ? 'end' : 'input-step')?.focus();
        return;
      }

      let value = (event.target as HTMLInputElement).value;
      const timeformat = identifyTimeFormat(value);

      onClearFieldError(id);

      if (timeformat === 'mm:ss') {
        setValue(id as 'start' | 'end' | 'step', value, {
          shouldValidate: true,
        });
      } else if (timeformat === 'seconds') {
        value = formatTime(parseFloat(value), 'mm:ss');
        setValue(id as 'start' | 'end' | 'step', value, {
          shouldValidate: true,
        });
      } else {
        setValue(id as 'start' | 'end' | 'step', id === 'start' ? '00:00' : formatTime(duration, 'mm:ss'), {
          shouldValidate: false,
        });
      }

      const nextElement = document.getElementById(id === 'start' ? 'end' : 'input-step');
      nextElement?.focus();
    }
  };

  const onSubmit = async (data: FieldValues) => {
    // Frames can't be re-extracted without the video; keep the ones on disk (spec §3).
    if (videoMissing) {
      nextStep();
      return;
    }
    onClearStepAlert('lens-correction-mismatch');
    onClearStepAlert('stabilization-min-regions');
    const lensCorrection = videoData.parameters.lensCorrection;
    if (lensCorrection) {
      const profileSize = await window.ipcRenderer.invoke('calibration-get-profile-size', {
        profilePath: lensCorrection,
      });
      if (profileSize) {
        const { width: vidW, height: vidH } = videoData.data;
        if (profileSize.width !== vidW || profileSize.height !== vidH) {
          onAddStepAlert(
            'lens-correction-mismatch',
            'error',
            t('VideoRange.Errors.profileResolutionMismatch', { calW: profileSize.width, calH: profileSize.height })
          );
          return;
        }
      }
    }
    const { stabilization, stabilizationRegions } = videoData.parameters;
    if (stabilization && stabilizationRegions.length < 2) {
      onAddStepAlert(
        'stabilization-min-regions',
        'error',
        t('VideoRange.minRegionsWarning', { defaultValue: 'Add at least 2 regions for stabilization' })
      );
      return;
    }
    onSetVideoParameters(data);
    nextStep();
  };

  const onError = (errors: FieldValues) => {
    Object.entries(errors).forEach(([name, value]) => {
      const message = (value as { message?: string })?.message;
      if (message) onSetFieldError(name, message);
    });
  };

  useEffect(() => {
    setVideo(document.getElementById('video') as HTMLVideoElement);
  }, [watchStep]);

  const currentTimeLabel = (field: string) =>
    t('VideoRange.useCurrentTime', { defaultValue: 'Set {{field}} to the current frame', field });

  return (
    <div className="body">
      <form onSubmit={handleSubmit(onSubmit, onError)} id="form-video">
        <fieldset
          className="fieldset-plain"
          disabled={videoMissing}
          title={videoMissing ? t(frames ? 'ProjectIssues.framesLocked' : 'ProjectIssues.videoLocked') : undefined}
        >
          <div className="panel-section">
            <div className="field-row field-row-top">
              <label className="field-row-label" htmlFor="start">
                {t('VideoRange.start')}
              </label>
              <span className="field-with-action">
                <button
                  type="button"
                  className="ibtn ibtn-sm"
                  id="start-button"
                  onClick={handleClick}
                  aria-label={currentTimeLabel(t('VideoRange.start'))}
                  title={currentTimeLabel(t('VideoRange.start'))}
                >
                  {Icons.Target('currentColor')}
                </button>
                <input
                  className="field field-coord"
                  defaultValue={frames ? '1' : '00:00'}
                  inputMode={frames ? 'numeric' : undefined}
                  id="start"
                  type="text"
                  {...register('start', validationRules.start)}
                  onBlur={handleBlur}
                  onKeyDown={handleKeyDown}
                />
              </span>
            </div>
            <FieldError name="start" />

            <div className="field-row field-row-top">
              <label className="field-row-label" htmlFor="end">
                {t('VideoRange.end')}
              </label>
              <span className="field-with-action">
                <button
                  type="button"
                  className="ibtn ibtn-sm"
                  id="end-button"
                  onClick={handleClick}
                  aria-label={currentTimeLabel(t('VideoRange.end'))}
                  title={currentTimeLabel(t('VideoRange.end'))}
                >
                  {Icons.Target('currentColor')}
                </button>
                <input
                  type="text"
                  className="field field-coord"
                  defaultValue={frames ? '1' : '00:00'}
                  inputMode={frames ? 'numeric' : undefined}
                  id="end"
                  {...register('end', validationRules.end)}
                  onBlur={handleBlur}
                  onKeyDown={handleKeyDown}
                />
              </span>
            </div>
            <FieldError name="end" />

            <div className="field-row field-row-top">
              <label className="field-row-label" htmlFor="input-step">
                {t('VideoRange.step')}
              </label>
              <input
                type="number"
                id="input-step"
                defaultValue={1}
                className="field field-coord"
                onKeyDown={handleKeyDown}
                {...register('step', validationRules.step)}
              />
            </div>
            <FieldError name="step" />

            <p className="field-readonly panel-summary">
              {t('VideoRange.framesSummary', {
                defaultValue: '{{count}} frames · every {{ms}} ms',
                count: numberOfFrames > 0 ? numberOfFrames : 0,
                ms: timeBetweenFrames,
              })}
            </p>
          </div>

          {/* Stabilization suits any moving camera, so UAV and oblique get it; a fixed ipcam never does.
              Not gated on extraFields/Advanced: regions must stay visible whenever stabilization is on,
              and the on/off switch itself must always be reachable to turn it on. */}
          {type !== 'ipcam' && <StabilizationRegions />}

          <VideoMetadata
            intervalField={
              <>
                <div className="field-row field-row-top">
                  <label className="field-row-label" htmlFor="interval">
                    {t('Step-2.timeBetweenFrames')}
                  </label>
                  <span className="field-with-unit">
                    <input
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      id="interval"
                      className="field field-coord"
                      {...register('interval', frames ? frameRules.interval : undefined)}
                    />
                    <span className="field-unit">ms</span>
                  </span>
                </div>
                <p className="field-readonly panel-summary">
                  {typedInterval !== null ? `${formatNumberTo2Decimals(fpsFromInterval(typedInterval))} fps` : ''}
                </p>
                <FieldError name="interval" />
              </>
            }
          />

          {extraFields && (
            <div className="panel-advanced">
              <hr className="panel-rule" />
              <FramesResolution />
              <LensCorrection />
            </div>
          )}
        </fieldset>
      </form>
    </div>
  );
};
