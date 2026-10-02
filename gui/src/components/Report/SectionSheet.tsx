import { useTranslation } from 'react-i18next';
import { getUnit } from '../../helpers';
import { useProjectSlice } from '../../hooks';
import { REPORT_SHEET, UNIT_CONVERSIONS } from '../../constants/constants';
import { TECHNIQUE_LABEL, type SectionResult } from '../../helpers/reportModel';
import { AllInOne } from '../Graphs';
import { ImageResults } from '../ImageResults';
import { StationTable } from './StationTable';

interface SectionSheetProps {
  result: SectionResult;
  rowStart: number;
  rowEnd: number;
  continued: boolean;
  frame: { width: number; height: number };
  factor: { x: number; y: number };
}

export const SectionSheet = ({ result, rowStart, rowEnd, continued, frame, factor }: SectionSheetProps) => {
  const { t } = useTranslation();
  const { projectDetails } = useProjectSlice();
  const qF = projectDetails.unitSistem === 'imperial' ? UNIT_CONVERSIONS.M3_TO_FT3 : 1;
  const flow = getUnit(projectDetails.unitSistem, 'flow');

  return (
    <>
      <header>
        <p className="doc-kicker">
          <span className={`doc-tech doc-tech--${result.technique}`}>{TECHNIQUE_LABEL[result.technique]}</span>
          {result.seeded && (
            <>
              {' '}
              <span className="doc-tag doc-tag--seeded">{t('Report.Doc.seeded', { defaultValue: 'Seeded' })}</span>
            </>
          )}
        </p>
        <h1 className="doc-h1">
          {result.name}
          {continued && (
            <span className="doc-meta"> ({t('Report.Doc.continued', { defaultValue: 'continued' })})</span>
          )}
        </h1>
        {!continued && (
          <p className="doc-q doc-q--section">
            {(result.totalQ * qF).toFixed(2)}
            <span className="doc-q-unit">{flow}</span>
            {result.qStd !== null && (
              <span className="doc-q-pm">
                ± {(result.qStd * qF).toFixed(2)} {flow}
              </span>
            )}
          </p>
        )}
        {!continued && (
          <p className="doc-meta">
            {result.measuredPct.toFixed(2)} % {t('Results.measured')} · {result.interpolatedPct.toFixed(2)} %{' '}
            {t('Results.interpolated')} · {result.numStations}{' '}
            {t('Report.Doc.stations', { defaultValue: 'stations' })}
            {result.alpha !== null && <> · α {result.alpha.toFixed(2)}</>}
          </p>
        )}
      </header>

      {!continued && (
        <figure className="doc-figure">
          <ImageResults
            reportFactor={factor}
            reportWidth={frame.width}
            reportHeight={frame.height}
            isReport={true}
            sectionIndex={result.index}
          />
        </figure>
      )}

      {!continued && (
        <AllInOne
          width={REPORT_SHEET.CONTENT_WIDTH}
          height={REPORT_SHEET.PLOT_HEIGHT}
          index={result.index}
          isReport={true}
        />
      )}

      {!continued && result.comparison.length > 1 && (
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

      <StationTable storeIndex={result.index} rowStart={rowStart} rowEnd={rowEnd} />
      <p className="doc-meta">* {t('Report.Doc.interpolatedStation', { defaultValue: 'interpolated station' })}</p>
    </>
  );
};
