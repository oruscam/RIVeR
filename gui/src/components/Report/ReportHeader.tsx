import { useTranslation } from 'react-i18next';
import { getUnit } from '../../helpers';
import { useProjectSlice } from '../../hooks';
import { UNIT_CONVERSIONS } from '../../constants/constants';
import {
  TECHNIQUE_LABEL,
  type AppliedCorrections,
  type ReportModel,
  type SummaryKey,
  type SummaryRow,
} from '../../helpers/reportModel';
import { FootageIcon } from './FootageIcon';

interface ReportHeaderProps {
  model: ReportModel;
  /** null with a single section: the table would repeat the section row. */
  summary: SummaryRow[] | null;
  applied: AppliedCorrections;
  footage: 'uav' | 'oblique' | 'ipcam' | '';
  version: string;
}

const FOOTAGE_DEFAULT = { uav: 'UAV (nadir)', oblique: 'Oblique', ipcam: 'IP camera', '': '-' };

/** Labels reuse the old report's Report.Summary keys, so existing translations keep working. */
const SUMMARY_LABEL: Record<SummaryKey, [string, string]> = {
  W: ['Report.Summary.width', 'Width'],
  A: ['Report.Summary.area', 'Area'],
  Q: ['Report.Summary.q', 'Q'],
  meanV: ['Report.Summary.meanV', 'meanV'],
  alpha: ['Report.Summary.alpha', 'Alpha'],
  meanVs: ['Report.Summary.averageVs', 'Average Vs'],
  maxD: ['Report.Summary.maxD', 'Max d'],
  meanD: ['Report.Summary.meanD', 'Mean d'],
  measured: ['Report.Summary.measured', '% Measured'],
};

export const ReportHeader = ({ model, summary, applied, footage, version }: ReportHeaderProps) => {
  const { t } = useTranslation();
  const { projectDetails } = useProjectSlice();
  const { riverName, site, meditionDate, unitSistem } = projectDetails;
  const qF = unitSistem === 'imperial' ? UNIT_CONVERSIONS.M3_TO_FT3 : 1;
  const flow = getUnit(unitSistem, 'flow');
  const q = (v: number) => (v * qF).toFixed(2);
  const lF = unitSistem === 'imperial' ? UNIT_CONVERSIONS.M_TO_FT : 1;
  const unitFactor = (unit: SummaryRow['unit']) =>
    unit === 'longitude' || unit === 'velocity' ? lF : unit === 'area' ? lF * lF : unit === 'flow' ? qF : 1;
  const measuredPct =
    model.sections.length === 0
      ? 0
      : model.sections.reduce((a, s) => a + s.measuredPct, 0) / model.sections.length;
  const stations = model.sections.reduce((a, s) => a + s.numStations, 0);

  return (
    <header className="rh">
      <div className="rh-mast">
        <h1 className="doc-h1">
          {riverName} @ {site}
        </h1>
        <div className="rh-meta">
          <span className="rh-footage">
            <FootageIcon type={footage} />
            {t(`Report.Doc.footage.${footage || 'none'}`, { defaultValue: FOOTAGE_DEFAULT[footage] })}
          </span>
          <span>
            <b>{meditionDate}</b> · RIVeR {version}
          </span>
        </div>
      </div>

      <div className="rh-verdict">
        <p className="doc-q">
          {q(model.totalQ)}
          <span className="doc-q-unit">{flow}</span>
          {model.qStdBetween !== null && (
            <span className="doc-q-pm">
              ± {q(model.qStdBetween)} {flow}
            </span>
          )}
        </p>
        <dl className="rh-facts">
          <div>
            <dt>{t('Results.measured')}</dt>
            <dd>{measuredPct.toFixed(2)} %</dd>
          </div>
          {model.cov !== null && (
            <div>
              <dt>COV</dt>
              <dd>{(model.cov * 100).toFixed(2)} %</dd>
            </div>
          )}
          <div>
            <dt>{t('Report.Doc.sections', { defaultValue: 'Sections' })}</dt>
            <dd>{model.sections.length}</dd>
          </div>
          <div>
            <dt>{t('Report.Doc.technique', { defaultValue: 'Technique' })}</dt>
            <dd>
              {model.techniquesUsed.map((tq) => (
                <span key={tq} className={`doc-tech doc-tech--${tq}`}>
                  {TECHNIQUE_LABEL[tq]}
                </span>
              ))}
            </dd>
          </div>
          <div>
            <dt>{t('Report.Doc.stationsTitle', { defaultValue: 'Stations' })}</dt>
            <dd>{stations}</dd>
          </div>
        </dl>
      </div>

      <ul className="doc-applied">
        {applied.lensCorrection && (
          <li>
            {t('Report.Doc.lens', { defaultValue: 'Lens correction' })} <b>{applied.lensCorrection}</b>
          </li>
        )}
        {applied.stabilizationRegions !== null && (
          <li>
            {t('Report.Doc.stabilization', {
              count: applied.stabilizationRegions,
              defaultValue_one: 'Stabilized ({{count}} region)',
              defaultValue_other: 'Stabilized ({{count}} regions)',
            })}
          </li>
        )}
        <li>
          {t('Report.Doc.step', { defaultValue: 'Frame step' })} <b>{applied.step}</b>
        </li>
        <li>
          {t('Report.Doc.resize', { defaultValue: 'Resize factor' })} <b>{applied.resizeFactor}</b>
        </li>
      </ul>

      {model.sections.length > 1 && (
        <div className="rh-tables">
          <table className="doc-table doc-table--numeric">
            <thead>
              <tr>
                <th>{t('Report.Doc.section', { defaultValue: 'Section' })}</th>
                <th>{t('Report.Doc.technique', { defaultValue: 'Technique' })}</th>
                <th>
                  Q<span className="doc-unit">{flow}</span>
                </th>
                <th>
                  ±σ<span className="doc-unit">{flow}</span>
                </th>
                <th>{t('Results.measured')}</th>
              </tr>
            </thead>
            <tbody>
              {model.sections.map((s) => (
                <tr key={s.index}>
                  <td>
                    {s.name}{' '}
                    {s.seeded && (
                      <span className="doc-tag doc-tag--seeded">
                        {t('Report.Doc.seeded', { defaultValue: 'Seeded' })}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={`doc-tech doc-tech--${s.technique}`}>{TECHNIQUE_LABEL[s.technique]}</span>
                  </td>
                  <td>{q(s.totalQ)}</td>
                  <td>{s.qStd !== null ? q(s.qStd) : '-'}</td>
                  <td>{s.measuredPct.toFixed(2)} %</td>
                </tr>
              ))}
            </tbody>
          </table>
          {summary && (
            <table className="doc-table doc-table--numeric">
              <thead>
                <tr>
                  <th />
                  <th>{t('Report.Summary.mean')}</th>
                  <th>{t('Report.Summary.stdDev')}</th>
                  <th>{t('Report.Summary.cov')}</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((row) => {
                  const [key, fallback] = SUMMARY_LABEL[row.key];
                  // The '% Measured' label already carries its unit.
                  const unit = row.unit === 'percent' || row.unit === 'none' ? '' : getUnit(unitSistem, row.unit);
                  const factor = unitFactor(row.unit);
                  const value = (v: number | null) => (v === null ? '-' : (v * factor).toFixed(2));
                  return (
                    <tr key={row.key}>
                      <td>
                        {t(key, { defaultValue: fallback })}
                        {unit && <span className="doc-meta"> {unit}</span>}
                        {row.lspivOnly && <span className="doc-meta"> (LSPIV)</span>}
                      </td>
                      <td>{value(row.mean)}</td>
                      <td>{value(row.std)}</td>
                      <td>{row.cov === null ? '-' : (row.cov * 100).toFixed(2) + ' %'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {model.skipped.length > 0 && (
        <p className="doc-meta">
          {t('Report.Doc.skipped', { defaultValue: 'Not processed, left out:' })} {model.skipped.join(', ')}
        </p>
      )}
    </header>
  );
};
