import { FormProvider, useForm } from 'react-hook-form';
import { useDataSlice, useSectionSlice, useUiSlice, useMaskedStations } from '../../hooks';
import { maskedNote } from '../../helpers/maskedNote';
import { useTranslation } from 'react-i18next';
import {
  AnalyzingProgress,
  ExportMp4,
  IwaveSettings,
  LspivSettings,
  ProcessingRunZone,
  RoiHeightRow,
} from './Components';
import { useEffect, useState } from 'react';
import type { PreviewMode } from '../../store/ui/types';
import { useStivAngleOverride } from '../../hooks';
import { useAnalyzeStage } from '../../hooks/useAnalyzeStage';
import { TechniqueRow } from '../TechniqueRow';
import { FieldError } from '../index';
import { Icons } from '../CustomIcons/Icons';
import { enabledStages, techniqueRunStatus, TechniqueRunStatus } from '../../helpers/analyzeRunState';
import type { StageKey } from '../../helpers/parseAnalyzeStage';
import type { IwaveDefaults } from '../../../commons/iwave';

/** A technique row's own run status, replacing the LSPIV → STIV → iWave breadcrumb. */
const RunStatus = ({ status }: { status: TechniqueRunStatus | null }) => {
  const { t } = useTranslation();
  if (status === null) return null;
  const text = {
    done: t('Processing.statusDone', { defaultValue: 'Done' }),
    running: t('Processing.statusRunning', { defaultValue: 'Running' }),
    queued: t('Processing.statusQueued', { defaultValue: 'Queued' }),
  }[status];
  return <span className={`tech-status${status === 'running' ? ' tech-status-running' : ''}`}>{text}</span>;
};

export const FormProcessing = ({
  extraFields,
  showMedian,
  setShowMedian,
  previewMode,
  setPreviewMode,
  canToggleSti,
  canToggleIwave,
  canToggleMedian,
  stivAvailable,
  iwaveDefaults,
}: {
  extraFields: boolean;
  showMedian: boolean;
  setShowMedian: React.Dispatch<React.SetStateAction<boolean>>;
  previewMode: PreviewMode;
  setPreviewMode: (value: PreviewMode) => void;
  canToggleSti: boolean;
  canToggleIwave: boolean;
  canToggleMedian: boolean;
  stivAvailable: boolean;
  iwaveDefaults: IwaveDefaults;
}) => {
  const { t } = useTranslation();
  const { onSetFieldError, onClearFieldError, onAddStepAlert, onClearStepAlert, onShowToast } = useUiSlice();
  const { isBackendWorking, processing, onSetQuiverTest, onSetQuiverAll, onKillBackend, onUpdateProcessing } =
    useDataSlice();
  const { sections, activeSection, onUpdateSection } = useSectionSlice();

  const {
    step1,
    heightRoi,
    removeBackground,
    clahe,
    clipLimit,
    stdFiltering,
    stdThreshold,
    medianTestFiltering,
    medianTestEpsilon,
    medianTestThreshold,
    stiv,
    iwave,
  } = processing.form;
  const iwaveWindowM = processing.form.iwaveManual?.windowSize ?? iwaveDefaults.windowSize;
  const masked = useMaskedStations(iwave ? iwaveWindowM : null);
  const stivMasked = maskedNote(masked.stiv);
  const iwaveMasked = maskedNote(masked.iwave);
  const maskedText = (note: ReturnType<typeof maskedNote>, technique: string) =>
    note.key === 'all'
      ? t('Processing.allStationsMasked', { technique })
      : t('Processing.maskedStations', { count: note.count });
  const { name, numStations } = sections[activeSection];
  // Station index is irrelevant for hasAny/resetAll — they operate on the whole
  // manual-angle array, not one station.
  const { hasAny: hasAnyStivOverride, resetAll: resetAllStivAngles } = useStivAngleOverride(0);

  // Don't let a persisted `stiv: true` from a previous session/machine (where
  // weights were present) silently run and fail — flip it off the moment we
  // learn the weights aren't here.
  useEffect(() => {
    if (!stivAvailable && stiv) onUpdateProcessing({ stiv: false });
  }, [stivAvailable, stiv, onUpdateProcessing]);

  const [isTesting, setIsTesting] = useState<boolean>(false);

  const running = isBackendWorking && !isTesting;
  const runState = useAnalyzeStage(running);
  const stages = enabledStages(stiv, iwave);
  const statusOf = (technique: StageKey): TechniqueRunStatus | null =>
    running ? techniqueRunStatus(technique, stages, runState.stage) : null;
  // D5: open the first time Advanced turns on; a collapse lasts while this step is mounted.
  const [lspivOpen, setLspivOpen] = useState<boolean>(true);
  const [iwaveOpen, setIwaveOpen] = useState<boolean>(true);

  const methods = useForm({
    defaultValues: {
      step_1: step1,
      roi_height: heightRoi,
      remove_background: removeBackground,
      clahe: clahe,
      clip_limit: clipLimit,
      std_filtering: stdFiltering,
      std_threshold: stdThreshold,
      median_test: medianTestFiltering,
      median_epsilon: medianTestEpsilon,
      median_threshold: medianTestThreshold,
    },
  });

  const handleStationsStep = (delta: number) => {
    const next = numStations + delta;
    if (next >= 3) {
      onUpdateSection({ numStations: next }, undefined);
      methods.setValue(`${name}_STATIONS_NUMBER`, next);
    }
  };

  const handleStationsChangeInput = (
    event: React.KeyboardEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement>
  ) => {
    if ((event as React.KeyboardEvent<HTMLInputElement>).key === 'Enter' || event.type === 'blur') {
      event.preventDefault();
      const value = parseFloat((event.target as HTMLInputElement).value);
      if (isNaN(value) === false && value >= 3) {
        onClearFieldError('stations-number');
        if (value !== numStations) {
          onUpdateSection({ numStations: value }, undefined);
        }
      } else {
        methods.setValue(`${name}_STATIONS_NUMBER`, numStations);
        if (typeof value === 'number') {
          onSetFieldError('stations-number', 'The number of stations must be greater than 2');
        }
      }
    }
  };

  const handleOnClickTest = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsTesting(true);
    onClearStepAlert('processing-backend-error');
    onSetQuiverTest()
      .then(() => setIsTesting(false))
      .catch((error) => onAddStepAlert('processing-backend-error', 'error', error.message));
  };

  const handleAnalyze = () => {
    if (isBackendWorking) return;
    setIsTesting(false);
    onClearStepAlert('processing-backend-error');
    onSetQuiverAll()
      .then(() => setShowMedian(true))
      .catch((error) => onAddStepAlert('processing-backend-error', 'error', error.message));
  };

  const handleStop = () => {
    onKillBackend();
  };

  // Technique toggles are icon-only (one ✓ glyph, D11), so each needs an
  // explicit accessible name; the same text doubles as the hover tooltip.
  const lspivToggleLabel = t('Processing.lspivAlwaysOn', { defaultValue: "LSPIV can't be turned off" });
  const stivToggleLabel = !stivAvailable
    ? t('Processing.stivWeightsMissing')
    : stiv
      ? t('Processing.stivToggleOn', { defaultValue: 'STIV is on (click to exclude from processing)' })
      : t('Processing.stivToggleOff', { defaultValue: 'STIV is off (click to include in processing)' });
  const iwaveToggleLabel = iwave
    ? t('Processing.iwaveToggleOn', { defaultValue: 'iWave is on (click to exclude from processing)' })
    : t('Processing.iwaveToggleOff', { defaultValue: 'iWave is off (click to include in processing)' });

  return (
    <>
      <div className={`body processing-body${extraFields ? ' is-advanced' : ''}`} id="form-analizing">
        <div className="wrapper">
          <FormProvider {...methods}>
            <form id="form-processing" className={`processing-form${extraFields ? ' is-advanced' : ''}`}>
              <div className="field-row field-row-top">
                <label className="field-row-label" htmlFor="stations-number">
                  {t('Results.stationNumber')}
                </label>
                <span className="field-stepper">
                  <button type="button" className="btn-step" onClick={() => handleStationsStep(-1)}>
                    −
                  </button>
                  <input
                    key={name}
                    className="field"
                    type="number"
                    defaultValue={numStations}
                    {...methods.register(`${name}_STATIONS_NUMBER`)}
                    id="stations-number"
                    onKeyDown={handleStationsChangeInput}
                    onBlur={handleStationsChangeInput}
                  />
                  <button type="button" className="btn-step" onClick={() => handleStationsStep(1)}>
                    +
                  </button>
                </span>
              </div>
              <FieldError name="stations-number" />
              {extraFields && <RoiHeightRow />}

              <hr className="panel-rule" />

              <TechniqueRow
                technique="lspiv"
                active={previewMode === 'frames'}
                className="tech-row technique-row-processing"
              >
                <span className="tech-name-cell">
                  <button
                    type="button"
                    className="field-title"
                    aria-pressed={previewMode === 'frames'}
                    title={t('Processing.showLspivFrames')}
                    onClick={() => {
                      if (previewMode === 'frames') return;
                      setPreviewMode('frames');
                    }}
                    style={previewMode === 'frames' ? { color: 'var(--tech-lspiv)' } : undefined}
                  >
                    LSPIV
                  </button>
                  <RunStatus status={statusOf('lspiv')} />
                </span>
                <ExportMp4 />
                <button
                  type="button"
                  className={`technique-seed-flag${showMedian ? ' technique-seed-flag-seeded' : ''}${
                    canToggleMedian ? '' : ' technique-flag-off'
                  }`}
                  title={t('Processing.medianHint')}
                  onClick={() => {
                    if (canToggleMedian) setShowMedian(!showMedian);
                  }}
                >
                  {t('Processing.carouselMedia')}
                </button>
                <label
                  className="switch switch-sm switch-locked"
                  title={lspivToggleLabel}
                  onClick={(event) => {
                    event.preventDefault();
                    onShowToast(lspivToggleLabel);
                  }}
                >
                  <input type="checkbox" checked readOnly aria-disabled="true" aria-label={lspivToggleLabel} />
                  <span className="slider"></span>
                </label>
                {extraFields && (
                  <span className="tech-cell tech-disclose">
                    <button
                      type="button"
                      className="ibtn ibtn-sm"
                      aria-expanded={lspivOpen}
                      aria-controls="lspiv-settings"
                      aria-label={t('Processing.lspivSettings', { defaultValue: 'LSPIV settings' })}
                      title={t('Processing.lspivSettings', { defaultValue: 'LSPIV settings' })}
                      onClick={() => setLspivOpen(!lspivOpen)}
                    >
                      {Icons.ChevDown('currentColor')}
                    </button>
                  </span>
                )}
              </TechniqueRow>
              {extraFields && lspivOpen && (
                <LspivSettings id="lspiv-settings" onClickTest={handleOnClickTest} isTesting={isTesting} />
              )}
              <TechniqueRow
                technique="stiv"
                active={previewMode === 'sti'}
                className={`tech-row technique-row-processing${
                  canToggleSti ? '' : ' technique-row-processing-disabled'
                }${stivAvailable ? '' : ' technique-row-processing-unavailable'}`}
              >
                <span className="tech-name-cell">
                  <button
                    type="button"
                    className="field-title"
                    aria-pressed={previewMode === 'sti'}
                    aria-disabled={!canToggleSti}
                    title={
                      !stivAvailable
                        ? t('Processing.stivWeightsMissing')
                        : canToggleSti
                          ? t('Processing.showStivStis')
                          : t('Processing.noStisYet')
                    }
                    onClick={() => {
                      if (!canToggleSti) return;
                      if (previewMode === 'sti') return;
                      setPreviewMode('sti');
                    }}
                    style={previewMode === 'sti' ? { color: 'var(--tech-stiv)' } : undefined}
                  >
                    STIV
                  </button>
                  {hasAnyStivOverride && (
                    <button
                      type="button"
                      className="sti-angle-reset"
                      title={t('Processing.stiAngleResetAllTitle')}
                      onClick={() => {
                        resetAllStivAngles();
                        onShowToast(
                          t('Processing.stiAngleResetAllToast', {
                            defaultValue: 'Angles reset for {{section}}',
                            section: name,
                          })
                        );
                      }}
                    >
                      {t('Processing.stiAngleResetAll')}
                    </button>
                  )}
                  <RunStatus status={statusOf('stiv')} />
                </span>
                <span className="tech-cell" />
                <span className="tech-cell" />
                <label className="switch switch-sm" title={stivToggleLabel}>
                  <input
                    type="checkbox"
                    checked={stiv && stivAvailable}
                    aria-disabled={!stivAvailable || undefined}
                    aria-label={stivToggleLabel}
                    onChange={() => {
                      if (!stivAvailable) return;
                      onUpdateProcessing({ stiv: !stiv });
                    }}
                  />
                  <span className="slider"></span>
                </label>
              </TechniqueRow>
              {stiv && stivAvailable && stivMasked.key !== 'none' && (
                <p className="tech-params-note tech-row-note">{maskedText(stivMasked, 'STIV')}</p>
              )}
              <TechniqueRow
                technique="iwave"
                active={previewMode === 'iwave'}
                className={`tech-row technique-row-processing${
                  canToggleIwave ? '' : ' technique-row-processing-disabled'
                }`}
              >
                <span className="tech-name-cell">
                  <button
                    type="button"
                    className="field-title"
                    aria-pressed={previewMode === 'iwave'}
                    aria-disabled={!canToggleIwave}
                    title={canToggleIwave ? t('Processing.showIwaveSpectra') : t('Processing.noSpectraYet')}
                    onClick={() => {
                      if (!canToggleIwave) return;
                      if (previewMode === 'iwave') return;
                      setPreviewMode('iwave');
                    }}
                    style={previewMode === 'iwave' ? { color: 'var(--tech-iwave)' } : undefined}
                  >
                    iWave
                  </button>
                  <RunStatus status={statusOf('iwave')} />
                </span>
                <span className="tech-cell" />
                <span className="tech-cell" />
                <label className="switch switch-sm" title={iwaveToggleLabel}>
                  <input
                    type="checkbox"
                    checked={iwave}
                    aria-label={iwaveToggleLabel}
                    onChange={() => {
                      onUpdateProcessing({ iwave: !iwave });
                    }}
                  />
                  <span className="slider"></span>
                </label>
                {extraFields && iwave && (
                  <span className="tech-cell tech-disclose">
                    <button
                      type="button"
                      className="ibtn ibtn-sm"
                      aria-expanded={iwaveOpen}
                      aria-controls="iwave-settings"
                      aria-label={t('Processing.iwaveSettings', { defaultValue: 'iWave settings' })}
                      title={t('Processing.iwaveSettings', { defaultValue: 'iWave settings' })}
                      onClick={() => setIwaveOpen(!iwaveOpen)}
                    >
                      {Icons.ChevDown('currentColor')}
                    </button>
                  </span>
                )}
              </TechniqueRow>
              {iwave && iwaveMasked.key !== 'none' && (
                <p className="tech-params-note tech-row-note">{maskedText(iwaveMasked, 'iWave')}</p>
              )}
              {iwave && iwaveDefaults.shortClip && iwaveDefaults.iwaveS !== null && (
                <p className="tech-params-note tech-row-note">
                  {t('Processing.iwaveShortClip', { seconds: iwaveDefaults.iwaveS.toFixed(1) })}
                </p>
              )}
              {extraFields && iwave && iwaveOpen && <IwaveSettings id="iwave-settings" defaults={iwaveDefaults} />}
            </form>
          </FormProvider>
        </div>
      </div>
      <ProcessingRunZone
        running={running}
        testing={isBackendWorking && isTesting}
        onAnalyze={handleAnalyze}
        onStop={handleStop}
      >
        <AnalyzingProgress state={runState} />
      </ProcessingRunZone>
    </>
  );
};
