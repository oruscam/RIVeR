import { useTranslation } from 'react-i18next';
import { getUnit } from '../../helpers';
import { useProjectSlice, useSectionSlice } from '../../hooks';
import { UNIT_CONVERSIONS } from '../../constants/constants';

export const Summary = () => {
  const { t } = useTranslation();
  const { sections, summary } = useSectionSlice();
  const { projectDetails } = useProjectSlice();
  const { unitSistem } = projectDetails;

  if (summary === undefined) return null;

  const { mean, std, cov } = summary;
  const isImperial = unitSistem === 'imperial';
  const lF = isImperial ? UNIT_CONVERSIONS.M_TO_FT : 1;
  const aF = isImperial ? UNIT_CONVERSIONS.M_TO_FT * UNIT_CONVERSIONS.M_TO_FT : 1;
  const qF = isImperial ? UNIT_CONVERSIONS.M3_TO_FT3 : 1;
  const cv = (v: number, f: number) => (v * f).toFixed(2);

  return (
    <>
      <h2 className="report-title-field mt-4" id="summary-title">
        {' '}
        {t('Report.Summary.title')}{' '}
      </h2>
      <div id="report-section-summary-container">
        <table>
          <thead>
            <tr>
              <th> {t('CrossSections.title')} </th>
              <th>
                <div> {t('Report.Summary.width')}</div>
                <div>{getUnit(unitSistem, 'longitude')} </div>
              </th>
              <th>
                <div> {t('Report.Summary.area')} </div>
                <div> {getUnit(unitSistem, 'area')} </div>
              </th>
              <th>
                <div> {t('Report.Summary.q')} </div>
                <div> {getUnit(unitSistem, 'flow')} </div>
              </th>
              <th>
                <div> {t('Report.Summary.meanV')} </div>
                <div> {getUnit(unitSistem, 'velocity')} </div>
              </th>
              <th>
                <div> {t('Report.Summary.alpha')} </div>
                <div> - </div>
              </th>
              <th>
                <div> {t('Report.Summary.averageVs')} </div>
                <div> {getUnit(unitSistem, 'velocity')} </div>
              </th>
              <th>
                <div> {t('Report.Summary.maxD')} </div>
                <div> {getUnit(unitSistem, 'longitude')} </div>
              </th>
              <th>
                <div> {t('Report.Summary.meanD')} </div>
                <div> {getUnit(unitSistem, 'longitude')} </div>
              </th>
              <th>
                <div> {t('Report.Summary.measured')} </div>
                <div> - </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {sections.map((section, index) => {
              const { name, data, alpha, bathimetry } = section;
              if (data === undefined) return null;
              const { mean_V, average_depth, max_depth, measured_Q, total_Q, total_A, mean_Vs } = data;
              return (
                <tr key={index} className={index === sections.length - 1 ? 'summary-last-section' : ''}>
                  <td> {name} </td>
                  <td> {bathimetry.width != null ? cv(bathimetry.width, lF) : '-'} </td>
                  <td> {cv(total_A, aF)} </td>
                  <td> {cv(total_Q, qF)} </td>
                  <td> {cv(mean_V, lF)} </td>
                  <td> {alpha} </td>
                  <td> {cv(mean_Vs, lF)} </td>
                  <td> {cv(max_depth, lF)} </td>
                  <td> {cv(average_depth, lF)} </td>
                  <td> {measured_Q * 100}</td>
                </tr>
              );
            })}
            <tr style={{ height: '30px' }}>
              <td> {t('Report.Summary.mean')} </td>
              <td> {cv(mean.total_W, lF)} </td>
              <td> {cv(mean.total_A, aF)} </td>
              <td> {cv(mean.total_Q, qF)} </td>
              <td> {cv(mean.mean_V, lF)} </td>
              <td> {mean.alpha} </td>
              <td> {cv(mean.mean_Vs, lF)} </td>
              <td> {cv(mean.max_depth, lF)} </td>
              <td> {cv(mean.average_depth, lF)} </td>
              <td> {mean.measured_Q * 100} </td>
            </tr>
            <tr style={{ height: '30px' }}>
              <td> {t('Report.Summary.stdDev')} </td>
              <td> {cv(std.total_W, lF)} </td>
              <td> {cv(std.total_A, aF)} </td>
              <td> {cv(std.total_Q, qF)} </td>
              <td> {cv(std.mean_V, lF)} </td>
              <td> {std.alpha} </td>
              <td> {cv(std.mean_Vs, lF)} </td>
              <td> {cv(std.max_depth, lF)} </td>
              <td> {cv(std.average_depth, lF)} </td>
              <td> {std.measured_Q * 100} </td>
            </tr>
            <tr style={{ height: '30px' }}>
              <td> {t('Report.Summary.cov')} </td>
              <td> {cov.total_W} </td>
              <td> {cov.total_A} </td>
              <td> {cov.total_Q} </td>
              <td> {cov.mean_V} </td>
              <td> {cov.alpha} </td>
              <td> {cov.mean_Vs} </td>
              <td> {cov.max_depth} </td>
              <td> {cov.average_depth} </td>
              <td> {cov.measured_Q * 100} </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
};
