import { useTranslation } from 'react-i18next';
import { formatNumberTo2Decimals, formatTime } from '../../helpers';
import { useDataSlice, useProjectSlice } from '../../hooks';
import { REPORT_FLOW } from '../../constants/constants';
import { frameBox, snapshotFrames } from '../../helpers/reportLayout';
import { TECHNIQUE_LABEL, lensLabel, type ReportModel } from '../../helpers/reportModel';
import { CalibrationPanel } from './CalibrationSheet';

const stamp = (d: Date) => d.toISOString().slice(0, 16).replace('T', ' ');

const FootagePanel = ({ measure = false }: { measure?: boolean }) => {
  const { t } = useTranslation();
  const { video, firstFramePath } = useProjectSlice();
  const { name, width, height, fps, duration, creation } = video.data;
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
            {width} × {height} · {formatNumberTo2Decimals(fps)} fps · {formatTime(duration)}
          </dd>
        </div>
        {created && (
          <div>
            <dt>{t('Report.VideoInfo.creationDate')}</dt>
            <dd>{stamp(created)}</dd>
          </div>
        )}
        <div>
          <dt>{t('Report.ProcessedRange.title')}</dt>
          <dd>
            {formatTime(p.startTime)} → {formatTime(p.endTime)}
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

export const ProcessingBlock = ({ model }: { model: ReportModel }) => {
  const { t } = useTranslation();
  const { processing } = useDataSlice();
  const form = processing.form;
  const { techniquesUsed } = model;
  const yes = t('Commons.yes');
  const notRecorded = t('Report.Doc.notRecorded', {
    defaultValue: 'Further parameters are not recorded in this version.',
  });
  return (
    <section>
      <h3 className="mc-title">{t('Report.Doc.processing', { defaultValue: 'Processing' })}</h3>
      <div className="method-three">
        {techniquesUsed.includes('lspiv') && (
          <dl className="doc-kv">
            <dt className="doc-kv-head">
              <span className="doc-tech doc-tech--lspiv">{TECHNIQUE_LABEL.lspiv}</span>
            </dt>
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
        {techniquesUsed.includes('stiv') && (
          <dl className="doc-kv">
            <dt className="doc-kv-head">
              <span className="doc-tech doc-tech--stiv">{TECHNIQUE_LABEL.stiv}</span>
            </dt>
            <dt>{t('Report.Doc.stivModel', { defaultValue: 'CNN model, weights' })}</dt>
            <dd>doi:10.5281/zenodo.22050810</dd>
            <dd className="doc-kv-note">{notRecorded}</dd>
          </dl>
        )}
        {techniquesUsed.includes('iwave') && (
          <dl className="doc-kv">
            <dt className="doc-kv-head">
              <span className="doc-tech doc-tech--iwave">{TECHNIQUE_LABEL.iwave}</span>
            </dt>
            <dd className="doc-kv-note">{notRecorded}</dd>
          </dl>
        )}
      </div>
    </section>
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
