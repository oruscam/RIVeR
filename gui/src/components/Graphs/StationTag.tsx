import { useTranslation } from 'react-i18next';
import { LuPin, LuPinOff } from 'react-icons/lu';
import { useProjectSlice, useSectionSlice, useUiSlice } from '../../hooks';
import { buildStationTagContent } from './stationTagContent';
import './graphs.css';

/**
 * Docked, pinnable readout for one station — replaces the old cursor-following
 * combined tooltip (AllInOne.tsx) and the canvas chevrons' own velocity-only
 * tooltip (drawVectors.ts) with a single card anchored over the canvas.
 * Shows whichever of {pinnedStation, hoveredStation} is set, preferring the
 * pinned one so toggling technique layers doesn't lose the detail view.
 */
export const StationTag = () => {
  const { t } = useTranslation();
  const { hoveredStation, pinnedStation, onPinStation, onUnpinStation } = useUiSlice();
  const { sections, activeSection } = useSectionSlice();
  const { video, projectDetails } = useProjectSlice();

  const section = sections[activeSection];
  const data = section?.data;
  const stationIndex = pinnedStation ?? hoveredStation;

  if (!data || stationIndex === null) return null;

  const content = buildStationTagContent({
    data,
    stationIndex,
    activeTechnique: section.activeTechnique,
    interpolated: section.interpolated,
    artificialSeeding: section.artificialSeeding,
    alpha: section.alpha,
    step: video.parameters.step,
    fps: video.data.fps,
    level: section.bathimetry.level,
    unitSistem: projectDetails.unitSistem,
  });

  if (!content) return null;

  const isPinned = pinnedStation !== null;

  return (
    <div className="station-tag">
      <div className="station-tag-header">
        <b>
          {t('Graphs.station')} {content.stationNumber}
        </b>
        <span>{content.distanceText}</span>
        <button
          type="button"
          className={`station-tag-pin-btn${isPinned ? ' station-tag-pin-btn-on' : ''}`}
          title={
            isPinned
              ? t('Results.unpinStation', { defaultValue: 'Unpin' })
              : t('Results.pinStation', { defaultValue: 'Click the station to pin' })
          }
          onClick={() => (isPinned ? onUnpinStation() : onPinStation(stationIndex))}
        >
          {isPinned ? <LuPinOff size={13} /> : <LuPin size={13} />}
        </button>
      </div>
      <div className="station-tag-kv">
        <span>{t('Graphs.discharge')}</span>
        <b>{content.dischargeText}</b>
        <span>{t('Results.depthArea', { defaultValue: 'Depth · area' })}</span>
        <b>{content.depthAreaText}</b>
        <span>{t('Graphs.stage')}</span>
        <b>{content.stageText}</b>
      </div>
      <div className="station-tag-table">
        {content.rows.map((row) => (
          <div className="station-tag-row" key={row.key}>
            <span
              className={`technique-swatch technique-swatch-${row.key}`}
              style={{ background: `var(--tech-${row.key})` }}
            />
            <span>{row.label}</span>
            <b>{row.velocityText}</b>
            <span>{row.spreadText}</span>
            <span className={row.qualityWarn ? 'station-tag-warn' : undefined}>{row.qualityText}</span>
          </div>
        ))}
      </div>
      <p className="station-tag-hint">
        {t('Results.stationTagHint', {
          defaultValue: 'Click the station to keep this open while you change layers',
        })}
      </p>
    </div>
  );
};
