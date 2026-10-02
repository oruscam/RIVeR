import { useTranslation } from 'react-i18next';
import { getUnit } from '../../helpers';
import { useProjectSlice } from '../../hooks';
import { REPORT_FLOW, UNIT_CONVERSIONS } from '../../constants/constants';
import { TECHNIQUE_LABEL, type SectionResult } from '../../helpers/reportModel';
import { ImageResults } from '../ImageResults';
import { ProfilePlot } from './ProfilePlot';
import { StationTable } from './StationTable';

interface SectionBlockProps {
  result: SectionResult;
  rowEnd: number;
  frame: { width: number; height: number };
  factor: { x: number; y: number };
  /** Measuring pass: same box sizes, no D3 drawing. */
  measure?: boolean;
}

export const SectionBlock = ({ result, rowEnd, frame, factor, measure = false }: SectionBlockProps) => {
  const { t } = useTranslation();
  const { projectDetails } = useProjectSlice();
  const qF = projectDetails.unitSistem === 'imperial' ? UNIT_CONVERSIONS.M3_TO_FT3 : 1;
  const flow = getUnit(projectDetails.unitSistem, 'flow');

  return (
    <article className="sec">
      <div className="sec-head">
        <h2 className="sec-name">{result.name}</h2>
        <span className={`doc-tech doc-tech--${result.technique}`}>{TECHNIQUE_LABEL[result.technique]}</span>
        {result.seeded && (
          <span className="doc-tag doc-tag--seeded">{t('Report.Doc.seeded', { defaultValue: 'Seeded' })}</span>
        )}
        <span className="sec-q">
          {(result.totalQ * qF).toFixed(2)}{' '}
          <span className="sec-q-unit">
            {result.qStd !== null && <>± {(result.qStd * qF).toFixed(2)} </>}
            {flow}
          </span>
        </span>
        <span className="doc-meta">
          {result.measuredPct.toFixed(2)} % {t('Results.measured')} · {result.interpolatedPct.toFixed(2)} %{' '}
          {t('Results.interpolated')} · {result.numStations}{' '}
          {t('Report.Doc.stations', { defaultValue: 'stations' })}
          {result.alpha !== null && <> · α {result.alpha.toFixed(2)}</>}
        </span>
      </div>

      {result.comparison.length > 1 && (
        <ul className="doc-compare">
          {result.comparison.map((c) => (
            <li key={c.technique} data-active={c.active}>
              <span className={`doc-tech doc-tech--${c.technique}`}>{TECHNIQUE_LABEL[c.technique]}</span>{' '}
              {(c.totalQ * qF).toFixed(2)} {flow}
              {c.active && <> · {t('Report.Doc.reported', { defaultValue: 'reported' })}</>}
            </li>
          ))}
        </ul>
      )}

      <div className="sec-row">
        <figure className="doc-figure sec-frame">
          {measure ? (
            <div style={{ width: frame.width, height: frame.height }} />
          ) : (
            <ImageResults
              reportFactor={factor}
              reportWidth={frame.width}
              reportHeight={frame.height}
              isReport={true}
              sectionIndex={result.index}
            />
          )}
        </figure>
        {measure ? (
          <div style={{ width: REPORT_FLOW.PLOT_WIDTH, height: REPORT_FLOW.PLOT_HEIGHT }} />
        ) : (
          <ProfilePlot storeIndex={result.index} />
        )}
      </div>

      <StationTable storeIndex={result.index} rowStart={0} rowEnd={rowEnd} />
    </article>
  );
};
