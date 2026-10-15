import { useTranslation } from 'react-i18next';
import { formatNumberTo2Decimals, formatTime, getUnit } from '../../helpers';
import { useDataSlice, useProjectSlice } from '../../hooks';
import { REPORT_FLOW, UNIT_CONVERSIONS } from '../../constants/constants';
import { frameBox, snapshotFrames } from '../../helpers/reportLayout';
import { formatStationRanges } from '../../helpers/stationRanges';
import { TECHNIQUE_LABEL, imageSequenceText, lensLabel, type ReportModel } from '../../helpers/reportModel';
import type { Technique } from '../../helpers/techniqueDischarge';
import { CalibrationPanel } from './CalibrationSheet';

const STIV_WEIGHTS_DOI = '10.5281/zenodo.22050810';

const stamp = (d: Date) => d.toISOString().slice(0, 16).replace('T', ' ');

const FootagePanel = ({ measure = false }: { measure?: boolean }) => {
  const { t } = useTranslation();
  const { video, firstFramePath } = useProjectSlice();
  const { name, width, height, fps, duration, creation, source, frameCount, intervalMs } = video.data;
  const isFrames = source === 'frames';
  const p = video.parameters;
  const box = frameBox(width, height, REPORT_FLOW.METHOD_IMAGE_WIDTH, REPORT_FLOW.METHOD_IMAGE_WIDTH);
  // Stabilization regions are stored in original-video pixels, so they scale straight onto the frame box.
  const sx = box.width / width;
  const sy = box.height / height;
  const lens = lensLabel(p.committedLensCorrection);
  const created = creation && !Number.isNaN(new Date(creation).getTime()) ? new Date(creation) : null;

  return (
    <section className={p.committedStabilization ? 'mc' : 'mc mc--text'}>
      <h3 className="mc-title">{t('Report.Doc.footageTitle', { defaultValue: 'Footage' })}</h3>
      {p.committedStabilization && (
        <figure className="doc-figure mc-img">
          {measure ? (
            <div style={{ width: box.width, height: box.height }} />
          ) : (
            <img src={firstFramePath} width={box.width} height={box.height} />
          )}
          {p.committedStabilizationRegions.map((r, i) => (
            <div
              key={i}
              className="doc-region"
              style={{ left: r.x * sx, top: r.y * sy, width: r.width * sx, height: r.height * sy }}
            >
              {p.committedStabilizationRegions.length > 1 && <span className="doc-region-n">{i + 1}</span>}
            </div>
          ))}
          <figcaption>
            {t('Report.Doc.stabilization', {
              count: p.committedStabilizationRegions.length,
              defaultValue_one: 'Stabilized ({{count}} region)',
              defaultValue_other: 'Stabilized ({{count}} regions)',
            })}
          </figcaption>
        </figure>
      )}
      {/* A row of facts, label over value: the footage is a handful of short values, not a table. */}
      <dl className="doc-facts">
        <div>
          <dt>{t('Report.VideoInfo.name')}</dt>
          <dd>{name ?? '-'}</dd>
        </div>
        <div>
          <dt>{t('Report.VideoInfo.resolution')}</dt>
          <dd>
            {isFrames ? (
              <>
                {width} × {height}
              </>
            ) : (
              <>
                {width} × {height} · {formatNumberTo2Decimals(fps)} fps · {formatTime(duration)}
              </>
            )}
          </dd>
        </div>
        {isFrames && (
          <div>
            <dt>{t('Report.Doc.sourceLabel')}</dt>
            <dd>
              {/* The interval is declared by the operator, not measured: the report says so. */}
              {imageSequenceText(frameCount, intervalMs, t)}
            </dd>
          </div>
        )}
        {created && (
          <div>
            <dt>{t('Report.VideoInfo.creationDate')}</dt>
            <dd>{stamp(created)}</dd>
          </div>
        )}
        <div>
          <dt>{t('Report.ProcessedRange.title')}</dt>
          <dd>
            {isFrames ? (
              <>
                {p.startFrame + 1} → {p.endFrame}
              </>
            ) : (
              <>
                {formatTime(p.startTime)} → {formatTime(p.endTime)}
              </>
            )}
          </dd>
        </div>
        <div>
          <dt>{t('Report.Doc.step', { defaultValue: 'Frame step' })}</dt>
          <dd>
            {p.step} · {((p.step / (fps || 1)) * 1000).toFixed(2)} ms
          </dd>
        </div>
        <div>
          <dt>{t('Report.Doc.resize', { defaultValue: 'Resize factor' })}</dt>
          <dd>{formatNumberTo2Decimals(p.committedFactor)}</dd>
        </div>
        {lens && (
          <div>
            <dt>{t('Report.Doc.lens', { defaultValue: 'Lens correction' })}</dt>
            <dd>{lens}</dd>
          </div>
        )}
      </dl>
    </section>
  );
};

export const MethodBlock = ({
  showCalibration,
  measure = false,
}: {
  showCalibration: boolean;
  measure?: boolean;
}) => {
  const { t } = useTranslation();
  return (
    <section className="method">
      <h2 className="method-h">{t('Report.Doc.howMeasured', { defaultValue: 'How this was measured' })}</h2>
      {showCalibration && <CalibrationPanel measure={measure} />}
      <FootagePanel measure={measure} />
    </section>
  );
};

export const SnapshotStrip = () => {
  const { t } = useTranslation();
  const { video } = useProjectSlice();
  const { images } = useDataSlice();
  const snapshots = snapshotFrames(images.paths.length, video.parameters.startTime, video.parameters.endTime);
  if (snapshots.length === 0) return null;
  // Explicit size so the block measures the same before and after the images load.
  const box = frameBox(
    video.data.width,
    video.data.height,
    REPORT_FLOW.STRIP_IMAGE_WIDTH,
    REPORT_FLOW.STRIP_IMAGE_WIDTH
  );
  return (
    <section>
      <h3 className="mc-title">{t('Report.Doc.acrossRange', { defaultValue: 'Across the processed range' })}</h3>
      <figure className="doc-figure doc-strip">
        {snapshots.map((s) => (
          <div key={s.index}>
            <img src={images.paths[s.index]} width={box.width} height={box.height} alt="" />
            <figcaption>{formatTime(s.time)}</figcaption>
          </div>
        ))}
      </figure>
    </section>
  );
};

/** One value when every section agrees, otherwise each section's own. */
const acrossSections = <T,>(entries: { section: string; params: T }[], format: (params: T) => string) => {
  const values = entries.map((e) => format(e.params));
  if (values.every((v) => v === values[0])) return values[0];
  return entries.map((e, i) => `${e.section}: ${values[i]}`).join(' · ');
};

/** The technique's name, and a note when its discharge was computed but is not the one reported. */
const TechniqueHead = ({ technique, model }: { technique: Technique; model: ReportModel }) => {
  const { t } = useTranslation();
  return (
    <dt className="doc-kv-head">
      <span className={`doc-tech doc-tech--${technique}`}>{TECHNIQUE_LABEL[technique]}</span>
      {!model.techniquesUsed.includes(technique) && (
        <span className="doc-kv-aside">
          {t('Report.Doc.comparisonOnly', { defaultValue: 'computed for comparison, not reported' })}
        </span>
      )}
    </dt>
  );
};

export const ProcessingBlock = ({ model }: { model: ReportModel }) => {
  const { t } = useTranslation();
  const { processing } = useDataSlice();
  const { projectDetails } = useProjectSlice();
  const form = processing.form;
  const { techniquesComputed, iwaveParams } = model;
  const lF = projectDetails.unitSistem === 'imperial' ? UNIT_CONVERSIONS.M_TO_FT : 1;
  const len = getUnit(projectDetails.unitSistem, 'longitude');
  const vel = getUnit(projectDetails.unitSistem, 'velocity');
  const yes = t('Commons.yes');
  const notRecorded = t('Report.Doc.notRecorded', {
    defaultValue: 'Further parameters are not recorded in this version.',
  });
  return (
    <section>
      <h3 className="mc-title">{t('Report.Doc.processing', { defaultValue: 'Processing' })}</h3>
      <div className="method-three">
        {techniquesComputed.includes('lspiv') && (
          <dl className="doc-kv">
            <TechniqueHead technique="lspiv" model={model} />
            {/* Unconditional: the GUI never passes --no-filter-grayscale, so the CLI always converts to grayscale. */}
            <dt>{t('Processing.grayscale')}</dt>
            <dd>{yes}</dd>
            {form.clahe && (
              <>
                <dt>{t('Processing.clahe')}</dt>
                <dd>
                  <span className="doc-nw">
                    {t('Processing.clipLimit')} {formatNumberTo2Decimals(form.clipLimit)}
                  </span>
                </dd>
              </>
            )}
            {form.removeBackground && (
              <>
                <dt>{t('Processing.removeBackground')}</dt>
                <dd>{yes}</dd>
              </>
            )}
            <dt>{t('Processing.windowSizes')}</dt>
            <dd>
              {form.step1} | {form.step1 / 2} px
            </dd>
            {form.stdFiltering && (
              <>
                <dt>{t('Processing.stdFiltering')}</dt>
                <dd>
                  <span className="doc-nw">
                    {t('Processing.threshold')} {formatNumberTo2Decimals(form.stdThreshold)}
                  </span>
                </dd>
              </>
            )}
            {form.medianTestFiltering && (
              <>
                <dt>{t('Processing.medianTestFiltering')}</dt>
                {/* Each half stays whole, so a narrow column breaks at the dot, never before the number. */}
                <dd>
                  <span className="doc-nw">ε {formatNumberTo2Decimals(form.medianTestEpsilon)}</span> ·{' '}
                  <span className="doc-nw">
                    {t('Processing.threshold')} {formatNumberTo2Decimals(form.medianTestThreshold)}
                  </span>
                </dd>
              </>
            )}
            {form.artificialSeeding && (
              <>
                <dt>{t('Processing.artificialSeeding')}</dt>
                <dd>{yes}</dd>
              </>
            )}
          </dl>
        )}
        {techniquesComputed.includes('stiv') && (
          <dl className="doc-kv">
            <TechniqueHead technique="stiv" model={model} />
            <dt>{t('Report.Doc.stivModel', { defaultValue: 'CNN model, weights' })}</dt>
            {/* The DOI may only break after its slash. */}
            <dd className="doc-doi">
              doi:{STIV_WEIGHTS_DOI.split('/')[0]}/<wbr />
              {STIV_WEIGHTS_DOI.split('/')[1]}
            </dd>
            {form.heightRoi > 0 && (
              <>
                <dt>{t('Processing.roiHeight')}</dt>
                <dd>
                  {formatNumberTo2Decimals(form.heightRoi * lF)} {len}
                </dd>
              </>
            )}
            {model.stivManualAngles.length > 0 && (
              <>
                <dt>{t('Report.Doc.manualAngles', { defaultValue: 'Angle set by the operator (stations)' })}</dt>
                <dd>
                  {model.stivManualAngles
                    .map((m) => `${m.section}: ${formatStationRanges(m.stations)}`)
                    .join(' · ')}
                </dd>
              </>
            )}
            <MaskedStations entries={model.maskedStations.stiv} />
          </dl>
        )}
        {techniquesComputed.includes('iwave') && (
          <dl className="doc-kv">
            <TechniqueHead technique="iwave" model={model} />
            {iwaveParams.length === 0 ? (
              <dd className="doc-kv-note">{notRecorded}</dd>
            ) : (
              <>
                <dt>{t('Processing.iwaveValues')}</dt>
                <dd>
                  {acrossSections(iwaveParams, (p) => {
                    if (p.manual) return t('Processing.iwaveModeManual');
                    if (p.sources.length === 0) return t('Processing.iwaveModeAuto');
                    return t('Report.Doc.autoFrom', {
                      sources: p.sources.map((s) => TECHNIQUE_LABEL[s]).join(' + '),
                      defaultValue: 'Automatic, estimated from {{sources}}',
                    });
                  })}
                </dd>
                <dt>{t('Processing.windowSize')}</dt>
                <dd>
                  {acrossSections(
                    iwaveParams,
                    (p) => `${formatNumberTo2Decimals(p.windowM * lF)} ${len} | ${p.windowPx} px`
                  )}
                </dd>
                <dt>{t('Report.Doc.maxVelocity', { defaultValue: 'Max velocity' })}</dt>
                <dd>{acrossSections(iwaveParams, (p) => `${formatNumberTo2Decimals(p.smax * lF)} ${vel}`)}</dd>
                <dt>{t('Processing.iwaveFlowType')}</dt>
                <dd>
                  {acrossSections(iwaveParams, (p) =>
                    t(p.gravityWaves ? 'Processing.iwaveFlowWaves' : 'Processing.iwaveFlowNoWaves')
                  )}
                </dd>
                {iwaveParams.every((e) => e.params.timeS !== null) && (
                  <>
                    <dt>{t('Report.Doc.timeWindow', { defaultValue: 'Time window' })}</dt>
                    <dd>
                      {acrossSections(iwaveParams, (p) => `${formatNumberTo2Decimals(p.timeS as number)} s`)}
                    </dd>
                  </>
                )}
              </>
            )}
            <MaskedStations entries={model.maskedStations.iwave} />
          </dl>
        )}
      </div>
    </section>
  );
};

/** Stations a technique skipped for sitting under the mask, per section. */
const MaskedStations = ({ entries }: { entries: ReportModel['maskedStations']['stiv'] }) => {
  const { t } = useTranslation();
  if (!entries?.length) return null;
  return (
    <>
      <dt>{t('Report.Doc.maskedStations', { defaultValue: 'Stations under a mask (not computed)' })}</dt>
      <dd>{entries.map((m) => `${m.section}: ${formatStationRanges(m.stations)}`).join(' · ')}</dd>
    </>
  );
};

/** Printed in every page footer, after the logo. */
export const Colophon = ({ version }: { version: string }) => {
  const { t } = useTranslation();
  return (
    <span className="doc-colophon">
      {t('Report.Doc.generatedWith', { version, defaultValue: 'Generated with RIVeR {{version}}' })} ·{' '}
      {stamp(new Date())} · github.com/oruscam/RIVeR
    </span>
  );
};
