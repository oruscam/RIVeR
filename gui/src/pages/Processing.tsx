import { useState, useEffect, useMemo, useRef } from 'react';
import { Carousel, StepAlertList, Toast, ImageProcessing, WizardButtons } from '../components';
import { useDataSlice, useIwaveDefaults, useSectionSlice, useUiSlice } from '../hooks';
import { flushStivAngleWrites } from '../hooks/useStivAngleOverride';
import { FormHeader } from '../components/Forms/Components';
import { useTranslation } from 'react-i18next';
import { useWizard } from 'react-use-wizard';
import { FormProcessing } from '../components/Forms';
import { PreviewModeControl } from '../components/PreviewModeControl';
import { AdvancedToggle } from '../components/AdvancedToggle';
import type { IwaveSpectraSidecar } from '../../electron/ipcMainHandlers/getIwaveSpectra';
import { alignStationImages, skipReasonLabelKey } from '../helpers/stationImages';

export const Processing = () => {
  const { t } = useTranslation();
  const { nextStep } = useWizard();
  const { onAddStepAlert, onClearStepAlert, onSetSeeAll, previewMode, onSetPreviewMode } = useUiSlice();
  const {
    images,
    fullQuiver,
    isBackendWorking,
    onSetActiveImage,
    onLoadResultData,
    processing,
    onToggleProcessingExtraFields,
  } = useDataSlice();
  const { extraFields } = processing;
  const [showMedian, setShowMedian] = useState(fullQuiver !== null);
  const iwaveDefaults = useIwaveDefaults({
    fullQuiver,
    heightRoi: processing.form.heightRoi,
    enabled: !isBackendWorking,
  });
  const [stiPaths, setStiPaths] = useState<string[]>([]);
  const [stiStations, setStiStations] = useState<number[]>([]);
  const [spectrumPaths, setSpectrumPaths] = useState<string[]>([]);
  const [spectrumStations, setSpectrumStations] = useState<number[]>([]);
  const [spectraSidecar, setSpectraSidecar] = useState<IwaveSpectraSidecar | null>(null);
  // Optimistic default: assume available so the checkbox doesn't flash
  // disabled on every mount while the (Python-backed) check is in flight —
  // the common case is that the weights are there.
  const [stivAvailable, setStivAvailable] = useState<boolean>(true);

  const { sections, activeSection } = useSectionSlice();
  const activeSectionName = sections[activeSection]?.name;

  // Track the previously-seen fullQuiver reference so we can tell "a new Analize
  // just completed" apart from "this component happened to mount/remount while
  // fullQuiver was already set" (e.g. loading a project with existing results,
  // or navigating back from Results) — only the former should trigger a reload
  // of section.data. Reloading unconditionally on every mount caused a burst of
  // redundant dispatches (one per section) on each such mount/remount, which is
  // expensive enough under dev-mode Redux middleware to look like the app hung.
  const prevFullQuiverRef = useRef(fullQuiver);

  useEffect(() => {
    if (fullQuiver !== null) {
      setShowMedian(true);
      if (fullQuiver !== prevFullQuiverRef.current) {
        onLoadResultData().catch(() => {});
      }
    }
    prevFullQuiverRef.current = fullQuiver;
  }, [fullQuiver]);

  useEffect(() => {
    let cancelled = false;
    window.ipcRenderer
      .invoke('get-stis', { sectionName: activeSectionName })
      .then((result: { stations: number[]; paths: string[] }) => {
        if (cancelled) return;
        setStiStations(result.stations);
        setStiPaths(result.paths);
      })
      .catch(() => {
        if (cancelled) return;
        setStiStations([]);
        setStiPaths([]);
      });
    return () => {
      cancelled = true;
    };
  }, [activeSectionName, fullQuiver]);

  useEffect(() => {
    let cancelled = false;
    window.ipcRenderer
      .invoke('get-iwave-spectra', { sectionName: activeSectionName })
      .then((result: { stations: number[]; paths: string[]; sidecar: IwaveSpectraSidecar | null }) => {
        if (cancelled) return;
        setSpectrumStations(result.stations);
        setSpectrumPaths(result.paths);
        setSpectraSidecar(result.sidecar);
      })
      .catch(() => {
        if (cancelled) return;
        setSpectrumStations([]);
        setSpectrumPaths([]);
        setSpectraSidecar(null);
      });
    return () => {
      cancelled = true;
    };
  }, [activeSectionName, fullQuiver]);

  useEffect(() => {
    let cancelled = false;
    window.ipcRenderer
      .invoke('check-stiv-weights')
      .then((result: { available: boolean }) => {
        if (!cancelled) setStivAvailable(result.available);
      })
      .catch(() => {
        if (!cancelled) setStivAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // STIV and iWave write no image for a station they skipped, so the file lists
  // can have gaps. Laying them out one slot per station keeps the carousel index
  // equal to the station index in every mode, which the viewers, the angle tuner
  // and the strip's markers all rely on.
  const sectionData = sections[activeSection]?.data;
  const stationCount = sectionData?.id?.length ?? 0;
  const stiSlots = useMemo(
    () => alignStationImages(stiStations, stiPaths, stationCount),
    [stiStations, stiPaths, stationCount]
  );
  const spectrumSlots = useMemo(
    () => alignStationImages(spectrumStations, spectrumPaths, stationCount),
    [spectrumStations, spectrumPaths, stationCount]
  );
  const stiEmptyLabels = useMemo(
    () => stiSlots.map((_, i) => t(skipReasonLabelKey(sectionData?.stiv_skip_profile?.[i]))),
    [stiSlots, sectionData?.stiv_skip_profile, t]
  );
  const spectrumEmptyLabels = useMemo(
    () => spectrumSlots.map((_, i) => t(skipReasonLabelKey(sectionData?.iwave_skip_profile?.[i]))),
    [spectrumSlots, sectionData?.iwave_skip_profile, t]
  );
  // Gated on the files, not the slots: a run that skipped every station wrote
  // none, and must not open a strip of placeholders.
  const hasStis = stiPaths.length > 0;
  const hasSpectra = spectrumPaths.length > 0;

  useEffect(() => {
    if (previewMode === 'sti' && !hasStis) onSetPreviewMode('frames');
    if (previewMode === 'iwave' && !hasSpectra) onSetPreviewMode('frames');
  }, [previewMode, hasStis, hasSpectra, onSetPreviewMode]);

  const { paths, active } = images;

  // Each mode has its own list length; a station index valid in one can be out
  // of range in another, so clamp whenever the active list changes.
  const activeList = previewMode === 'sti' ? stiSlots : previewMode === 'iwave' ? spectrumSlots : paths;

  useEffect(() => {
    if (previewMode !== 'frames' && activeList.length > 0 && active >= activeList.length) {
      onSetActiveImage(0);
    }
  }, [previewMode, activeList, active, onSetActiveImage]);

  const handleNext = async () => {
    try {
      onClearStepAlert('processing-load-results');
      // onLoadResultData re-reads xsections.json and replaces section.data
      // wholesale, so any angle write still sitting in the debounce window has
      // to land on disk first or it would be read back as if it never happened.
      await flushStivAngleWrites();
      await onLoadResultData();
      onSetSeeAll(false);
      nextStep();
    } catch (error) {
      onAddStepAlert('processing-load-results', 'error', (error as Error).message);
    }
  };

  return (
    <div className="regular-page">
      <div className="media-container">
        <PreviewModeControl
          previewMode={previewMode}
          onSetPreviewMode={onSetPreviewMode}
          canToggleSti={hasStis}
          canToggleIwave={hasSpectra}
          stivAvailable={stivAvailable}
        />
        <ImageProcessing
          showMedian={showMedian}
          previewMode={previewMode}
          stiPaths={stiSlots}
          stiEmptyLabels={stiEmptyLabels}
          spectrumPaths={spectrumSlots}
          spectrumEmptyLabels={spectrumEmptyLabels}
          spectraSidecar={spectraSidecar}
        />
        <Carousel
          images={activeList}
          emptyLabels={
            previewMode === 'sti' ? stiEmptyLabels : previewMode === 'iwave' ? spectrumEmptyLabels : undefined
          }
          active={active}
          setActiveImage={onSetActiveImage}
          showMedian={showMedian && fullQuiver !== null}
          setShowMedian={setShowMedian}
          mode={previewMode === 'frames' ? 'analize' : 'processing'}
          showStivMarkers={previewMode === 'sti'}
        />
      </div>
      <div className="form-container">
        <FormHeader title={t('Processing.title')} showSections={false} />
        <StepAlertList />
        <FormProcessing
          extraFields={extraFields}
          showMedian={showMedian}
          setShowMedian={setShowMedian}
          previewMode={previewMode}
          setPreviewMode={onSetPreviewMode}
          canToggleSti={hasStis}
          canToggleIwave={hasSpectra}
          canToggleMedian={fullQuiver !== null}
          stivAvailable={stivAvailable}
          iwaveDefaults={iwaveDefaults}
        />
        <div className="footer">
          <AdvancedToggle
            setLocalExtraFields={onToggleProcessingExtraFields}
            localExtraFields={extraFields}
            disabled={isBackendWorking}
          />
          <WizardButtons onClickNext={handleNext} canFollow={fullQuiver !== null} />
        </div>
      </div>
      <Toast />
    </div>
  );
};
