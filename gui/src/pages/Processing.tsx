import { useState, useEffect, useRef } from 'react';
import { Carousel, Error, ImageProcessing, WizardButtons } from '../components';
import { useDataSlice, useSectionSlice, useUiSlice } from '../hooks';
import { flushStivAngleWrites } from '../hooks/useStivAngleOverride';
import { FormHeader } from '../components/Forms/Components';
import { useTranslation } from 'react-i18next';
import { useWizard } from 'react-use-wizard';
import { FormProcessing } from '../components/Forms';
import { LockBtn } from '../components/CustomIcons/LockBtn';
import { ExportMp4 } from '../components/Forms/Components';
import type { PreviewMode } from '../store/ui/types';
import type { IwaveSpectraSidecar } from '../../electron/ipcMainHandlers/getIwaveSpectra';

export const Processing = () => {
  const { t } = useTranslation();
  const { nextStep } = useWizard();
  const { onSetErrorMessage, onSetSeeAll } = useUiSlice();
  const { images, fullQuiver, isBackendWorking, onSetActiveImage, onLoadResultData } = useDataSlice();
  const [showMedian, setShowMedian] = useState(fullQuiver !== null);
  const [extraFields, setExtraFields] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('frames');
  const [stiPaths, setStiPaths] = useState<string[]>([]);
  const [stiStations, setStiStations] = useState<number[]>([]);
  const [spectrumPaths, setSpectrumPaths] = useState<string[]>([]);
  const [spectrumStations, setSpectrumStations] = useState<number[]>([]);
  const [spectraSidecar, setSpectraSidecar] = useState<IwaveSpectraSidecar | null>(null);

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
    if (previewMode === 'sti' && stiPaths.length === 0) setPreviewMode('frames');
    if (previewMode === 'iwave' && spectrumPaths.length === 0) setPreviewMode('frames');
  }, [previewMode, stiPaths, spectrumPaths]);

  const { paths, active } = images;

  // Each mode has its own list length; a station index valid in one can be out
  // of range in another, so clamp whenever the active list changes.
  const activeList = previewMode === 'sti' ? stiPaths : previewMode === 'iwave' ? spectrumPaths : paths;

  useEffect(() => {
    if (previewMode !== 'frames' && activeList.length > 0 && active >= activeList.length) {
      onSetActiveImage(0);
    }
  }, [previewMode, activeList, active, onSetActiveImage]);

  const handleNext = async () => {
    try {
      // onLoadResultData re-reads xsections.json and replaces section.data
      // wholesale, so any angle write still sitting in the debounce window has
      // to land on disk first or it would be read back as if it never happened.
      await flushStivAngleWrites();
      await onLoadResultData();
      onSetSeeAll(false);
      nextStep();
    } catch (error) {
      onSetErrorMessage((error as Error).message);
    }
  };

  return (
    <div className="regular-page">
      <div className="media-container">
        <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 1000 }}>
          <ExportMp4 />
        </div>
        <ImageProcessing
          showMedian={showMedian}
          extraFields={extraFields}
          previewMode={previewMode}
          stiPaths={stiPaths}
          stiStations={stiStations}
          spectrumPaths={spectrumPaths}
          spectrumStations={spectrumStations}
          spectraSidecar={spectraSidecar}
        />
        <Carousel
          images={activeList}
          active={active}
          setActiveImage={onSetActiveImage}
          showMedian={showMedian && fullQuiver !== null}
          setShowMedian={setShowMedian}
          mode={previewMode === 'frames' ? 'analize' : 'processing'}
          showStivMarkers={previewMode === 'sti'}
        />
        <Error />
      </div>
      <div className="form-container">
        <FormHeader title={t('Processing.title')} showSections={false} />
        <FormProcessing
          extraFields={extraFields}
          showMedian={showMedian}
          setShowMedian={setShowMedian}
          previewMode={previewMode}
          setPreviewMode={setPreviewMode}
          canToggleSti={stiPaths.length > 0}
          canToggleIwave={spectrumPaths.length > 0}
          canToggleMedian={fullQuiver !== null}
        />
        <div className="footer">
          <LockBtn
            setLocalExtraFields={setExtraFields}
            localExtraFields={extraFields}
            footerElementID="processing-footer"
            headerElementID="processing-header"
            disabled={isBackendWorking}
          />
          <WizardButtons onClickNext={handleNext} canFollow={fullQuiver !== null} />
        </div>
      </div>
    </div>
  );
};
