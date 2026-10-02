import { useTranslation } from 'react-i18next';
import { formatTime } from '../../helpers';
import { useDataSlice, useProjectSlice } from '../../hooks';
import { REPORT_SHEET } from '../../constants/constants';
import { frameBox, snapshotFrames } from '../../helpers/reportLayout';
import { TECHNIQUE_LABEL, lensLabel, type ReportModel } from '../../helpers/reportModel';

interface FootageSheetProps {
  model: ReportModel;
  version: string;
}

const stamp = (d: Date) => d.toISOString().slice(0, 16).replace('T', ' ');

export const FootageSheet = ({ model, version }: FootageSheetProps) => {
  const { t } = useTranslation();
  const { video, firstFramePath } = useProjectSlice();
  const { processing, images } = useDataSlice();
  const { name, width, height, fps, duration, creation } = video.data;
  const p = video.parameters;
  const form = processing.form;
  const box = frameBox(width, height, REPORT_SHEET.CONTENT_WIDTH, REPORT_SHEET.FOOTAGE_FRAME_MAX_HEIGHT);
  // Stabilization regions are stored in original-video pixels (the region editor maps pointer
  // positions through videoWidth / videoHeight), so they scale straight onto the frame box.
  const sx = box.width / width;
  const sy = box.height / height;
  const lens = lensLabel(p.committedLensCorrection);
  const { techniquesUsed } = model;
  const yes = t('Commons.yes');
  const snapshots = snapshotFrames(images.paths.length, p.startTime, p.endTime);
  const created = creation && !Number.isNaN(new Date(creation).getTime()) ? new Date(creation) : null;

  return (
    <>
      <h1 className="doc-h1">
        {t('Report.Doc.footageAndParameters', { defaultValue: 'Footage and parameters' })}
      </h1>

      <dl className="doc-kv">
        <dt>{t('Report.VideoInfo.name')}</dt>
        <dd>{name ?? '-'}</dd>
        <dt>{t('Report.VideoInfo.resolution')}</dt>
        <dd>
          {width} × {height} · {fps} fps · {formatTime(duration)}
        </dd>
        {created && (
          <>
            <dt>{t('Report.VideoInfo.creationDate')}</dt>
            <dd>{stamp(created)}</dd>
          </>
        )}
        <dt>{t('Report.ProcessedRange.title')}</dt>
        <dd>
          {formatTime(p.startTime)} → {formatTime(p.endTime)} ·{' '}
          {t('Report.Doc.step', { defaultValue: 'Frame step' })} {p.step} ·{' '}
          {((p.step / (fps || 1)) * 1000).toFixed(2)} ms
        </dd>
        <dt>{t('Report.Doc.resize', { defaultValue: 'Resize factor' })}</dt>
        <dd>{p.committedFactor}</dd>
        {lens && (
          <>
            <dt>{t('Report.Doc.lens', { defaultValue: 'Lens correction' })}</dt>
            <dd>{lens}</dd>
          </>
        )}
      </dl>

      {snapshots.length > 0 && (
        <figure className="doc-figure doc-strip">
          {snapshots.map((s) => (
            <div key={s.index}>
              <img src={images.paths[s.index]} alt="" />
              <figcaption>{formatTime(s.time)}</figcaption>
            </div>
          ))}
        </figure>
      )}

      {p.committedStabilization && (
        <figure className="doc-figure">
          <img src={firstFramePath} width={box.width} height={box.height} />
          {p.committedStabilizationRegions.map((r, i) => (
            <div
              key={i}
              className="doc-region"
              style={{ left: r.x * sx, top: r.y * sy, width: r.width * sx, height: r.height * sy }}
            />
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

      {techniquesUsed.includes('lspiv') && (
        <div>
          <h2 className="doc-h2">{TECHNIQUE_LABEL.lspiv}</h2>
          <dl className="doc-kv">
            {form.clahe && (
              <>
                <dt>{t('Processing.clahe')}</dt>
                <dd>
                  {t('Processing.clipLimit')} {form.clipLimit}
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
                  {t('Processing.threshold')} {form.stdThreshold}
                </dd>
              </>
            )}
            {form.medianTestFiltering && (
              <>
                <dt>{t('Processing.medianTestFiltering')}</dt>
                <dd>
                  ε {form.medianTestEpsilon} · {t('Processing.threshold')} {form.medianTestThreshold}
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
        </div>
      )}

      {techniquesUsed.includes('stiv') && (
        <div>
          <h2 className="doc-h2">{TECHNIQUE_LABEL.stiv}</h2>
          <p className="doc-meta">
            {t('Report.Doc.notRecorded', { defaultValue: 'Further parameters are not recorded in this version.' })}
          </p>
        </div>
      )}

      {techniquesUsed.includes('iwave') && (
        <div>
          <h2 className="doc-h2">{TECHNIQUE_LABEL.iwave}</h2>
          <p className="doc-meta">
            {t('Report.Doc.notRecorded', { defaultValue: 'Further parameters are not recorded in this version.' })}
          </p>
        </div>
      )}

      <footer className="doc-meta doc-colophon">
        {t('Report.Doc.generatedWith', { version, defaultValue: 'Generated with RIVeR {{version}}' })} ·{' '}
        {stamp(new Date())} · github.com/oruscam/RIVeR · doi:10.1016/j.cageo.2017.07.009
        {techniquesUsed.includes('stiv') && (
          <> · {t('Report.Doc.stivWeights', { defaultValue: 'STIV CNN weights' })} doi:10.5281/zenodo.22050810</>
        )}
        {techniquesUsed.includes('iwave') && <> · iWave: dataforwater (github.com/dataforwater/iwave)</>}
      </footer>
    </>
  );
};
