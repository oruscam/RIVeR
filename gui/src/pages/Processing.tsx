import { useState, useEffect, useRef } from 'react';
import { Carousel, Error, ImageProcessing, WizardButtons } from '../components';
import { useDataSlice, useSectionSlice, useUiSlice } from '../hooks';
import { FormHeader } from '../components/Forms/Components';
import { useTranslation } from 'react-i18next';
import { useWizard } from 'react-use-wizard';
import { FormProcessing } from '../components/Forms';
import { LockBtn } from '../components/CustomIcons/LockBtn';
import { ExportMp4 } from '../components/Forms/Components';

export const Processing = () => {
  const { t } = useTranslation();
  const { nextStep } = useWizard();
  const { onSetErrorMessage, onSetSeeAll } = useUiSlice();
  const { images, fullQuiver, isBackendWorking, onSetActiveImage, onGetResultData } = useDataSlice();
  const [showMedian, setShowMedian] = useState(fullQuiver !== null);
  const [extraFields, setExtraFields] = useState(false);
  const [stiMode, setStiMode] = useState(false);
  const [stiPaths, setStiPaths] = useState<string[]>([]);
  const [stiStations, setStiStations] = useState<number[]>([]);

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
        onGetResultData('all').catch(() => {});
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
    if (stiPaths.length === 0) setStiMode(false);
  }, [stiPaths]);

  const { paths, active } = images;

  useEffect(() => {
    if (stiMode && stiPaths.length > 0 && active >= stiPaths.length) {
      onSetActiveImage(0);
    }
  }, [stiMode, stiPaths, active, onSetActiveImage]);

  const handleNext = async () => {
    nextStep();

    try {
      await onGetResultData('all');
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
          stiMode={stiMode}
          stiPaths={stiPaths}
          stiStations={stiStations}
        />
        <Carousel
          images={stiMode ? stiPaths : paths}
          active={active}
          setActiveImage={onSetActiveImage}
          showMedian={showMedian && fullQuiver !== null}
          setShowMedian={setShowMedian}
          mode={stiMode ? 'processing' : 'analize'}
        />
        <Error />
      </div>
      <div className="form-container">
        <FormHeader title={t('Processing.title')} showSections={false} />
        <FormProcessing
          extraFields={extraFields}
          showMedian={showMedian}
          setShowMedian={setShowMedian}
          stiMode={stiMode}
          setStiMode={setStiMode}
          canToggleSti={stiPaths.length > 0}
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
