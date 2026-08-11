import { getUnit } from '../../helpers';
import { useProjectSlice } from '../../hooks';
import { UNIT_CONVERSIONS } from '../../constants/constants';
import { SectionData } from '../../store/section/types';

export const ReportSectionTable = ({ data }: { data: SectionData }) => {
  const { projectDetails } = useProjectSlice();
  const { unitSistem } = projectDetails;
  const isImperial = unitSistem === 'imperial';
  const lFactor = isImperial ? UNIT_CONVERSIONS.M_TO_FT : 1;
  const aFactor = isImperial ? UNIT_CONVERSIONS.M_TO_FT * UNIT_CONVERSIONS.M_TO_FT : 1;
  const qFactor = isImperial ? UNIT_CONVERSIONS.M3_TO_FT3 : 1;

  const half = Math.ceil(data.id.length / 2);
  const firstHalf = {
    id: data.id.slice(0, half),
    distance: data.distance.slice(0, half),
    depth: data.depth.slice(0, half),
    A: data.A.slice(0, half),
    streamwise_magnitude: data.streamwise_velocity_magnitude.slice(0, half),
    Q: data.Q.slice(0, half),
  };

  const secondHalf = {
    id: data.id.slice(half),
    distance: data.distance.slice(half),
    depth: data.depth.slice(half),
    A: data.A.slice(half),
    streamwise_magnitude: data.streamwise_velocity_magnitude.slice(half),
    Q: data.Q.slice(half),
  };

  const renderTable = (data: SectionData) => (
    <table>
      <thead>
        <tr>
          <th> # </th>
          <th>
            <div>x</div>
            <div>{getUnit(unitSistem, 'longitude')}</div>
          </th>
          <th>
            <div>d</div>
            <div>{getUnit(unitSistem, 'longitude')}</div>
          </th>
          <th>
            <div>A</div>
            <div>{getUnit(unitSistem, 'area')}</div>
          </th>
          <th>
            <div>Vs</div>
            <div>{getUnit(unitSistem, 'velocity')}</div>
          </th>
          <th>
            <div>Q</div>
            <div>{getUnit(unitSistem, 'flow')}</div>
          </th>
        </tr>
      </thead>
      <tbody>
        {data.id.map((row: number, index: number) => (
          <tr key={index}>
            <td>{row}</td>
            <td>{data.distance[index] != null ? (data.distance[index] * lFactor).toFixed(2) : '-'}</td>
            <td>{data.depth[index] != null ? (data.depth[index] * lFactor).toFixed(2) : '-'}</td>
            <td>{data.A[index] != null ? (data.A[index] * aFactor).toFixed(2) : '-'}</td>
            <td>
              {data.streamwise_magnitude[index] != null
                ? (data.streamwise_magnitude[index] * lFactor).toFixed(2)
                : '-'}
            </td>
            <td>{data.Q[index] != null ? (data.Q[index] * qFactor).toFixed(2) : '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div id="report-section-table">
      {renderTable(firstHalf)}
      {renderTable(secondHalf)}
    </div>
  );
};
