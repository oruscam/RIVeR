import { useTranslation } from 'react-i18next';
import { getUnit } from '../../helpers';
import { getEffectiveTechniqueData } from '../../helpers/techniqueDischarge';
import { splitInto } from '../../helpers/reportFlow';
import { useProjectSlice, useSectionSlice } from '../../hooks';
import { REPORT_FLOW, UNIT_CONVERSIONS } from '../../constants/constants';

interface StationTableProps {
  /** Index into the store's sections. */
  storeIndex: number;
  rowStart: number;
  rowEnd: number;
}

export const StationTable = ({ storeIndex, rowStart, rowEnd }: StationTableProps) => {
  const { t } = useTranslation();
  const { sections } = useSectionSlice();
  const { projectDetails, video } = useProjectSlice();
  const section = sections[storeIndex];
  const data = section.data;
  if (!data) return null;

  const { unitSistem } = projectDetails;
  const imperial = unitSistem === 'imperial';
  const lF = imperial ? UNIT_CONVERSIONS.M_TO_FT : 1;
  const aF = lF * lF;
  const qF = imperial ? UNIT_CONVERSIONS.M3_TO_FT3 : 1;

  const effective = getEffectiveTechniqueData(data, section.activeTechnique, {
    interpolated: section.interpolated,
    artificialSeeding: section.artificialSeeding,
    alpha: section.alpha,
    step: video.parameters.step,
    fps: video.data.fps,
  });
  if (!effective) return null;

  const fmt = (v: number | null | undefined, f: number) => (typeof v === 'number' ? (v * f).toFixed(2) : '-');

  const column = ([start, end]: [number, number]) => (
    <table className="doc-table doc-table--numeric" key={start}>
      <thead>
        <tr>
          <th>#</th>
          <th>
            x<span className="doc-unit">{getUnit(unitSistem, 'longitude')}</span>
          </th>
          <th>
            d<span className="doc-unit">{getUnit(unitSistem, 'longitude')}</span>
          </th>
          <th>
            A<span className="doc-unit">{getUnit(unitSistem, 'area')}</span>
          </th>
          <th>
            Vs<span className="doc-unit">{getUnit(unitSistem, 'velocity')}</span>
          </th>
          <th>
            Q<span className="doc-unit">{getUnit(unitSistem, 'flow')}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: end - start }, (_, k) => start + k).map((i) => (
          <tr key={i}>
            <td>
              {i + 1}
              {effective.interpFlags[i] ? '*' : ''}
            </td>
            <td>{fmt(data.distance[i], lF)}</td>
            <td>{fmt(data.depth[i], lF)}</td>
            <td>{fmt(effective.A[i], aF)}</td>
            <td>{fmt(effective.resolved[i], lF)}</td>
            <td>{effective.resolved[i] === null ? '-' : fmt(effective.Q[i], qF)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const starred = effective.interpFlags.slice(rowStart, rowEnd).some(Boolean);
  return (
    <>
      <div className="doc-cols doc-cols--3">
        {splitInto(rowStart, rowEnd, REPORT_FLOW.TABLE_COLUMNS).map(column)}
      </div>
      {starred && (
        <p className="doc-note">
          * {t('Report.Doc.interpolatedStation', { defaultValue: 'interpolated station' })}
        </p>
      )}
    </>
  );
};
