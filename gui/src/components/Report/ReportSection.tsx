import { useTranslation } from 'react-i18next';
import { REPORT_IMAGES, UNIT_CONVERSIONS, UNITS } from '../../constants/constants';
import { useProjectSlice, useSectionSlice } from '../../hooks';
import { AllInOne } from '../Graphs';
import { ReportSectionTable } from './ReportSectionTable';
import { ImageResults } from '../ImageResults';

interface ReportSectionProps {
  index: number;
  vertical?: boolean;
  factor: {
    x: number;
    y: number;
  };
}

export const ReportSection = ({ index, factor, vertical }: ReportSectionProps) => {
  const { sections } = useSectionSlice();
  const { name, data } = sections[index];
  const { projectDetails } = useProjectSlice();
  const isImperial = projectDetails.unitSistem === 'imperial';
  const qFactor = isImperial ? UNIT_CONVERSIONS.M3_TO_FT3 : 1;
  const flowUnit = isImperial ? UNITS.IMPERIAL.FLOW : UNITS.SI.FLOW;
  const { t } = useTranslation();

  if (!data) return null;

  const width = vertical ? REPORT_IMAGES.VERTICAL_IMAGES_WIDTH : REPORT_IMAGES.HORIZONTAL_IMAGES_WIDTH;
  const height = vertical ? REPORT_IMAGES.VERTICAL_IMAGES_HEIGHT : REPORT_IMAGES.HORIZONTAL_IMAGES_HEIGHT;

  const { total_Q, total_q_std, measured_Q, interpolated_Q, alpha, num_stations } = data;

  return (
    <div id="report-section-container">
      <div id="report-section-top-container">
        <div id="report-section-top-left-container">
          <h1 className="report-section-title"> {name} </h1>
          <h3 id="report-section-discharge-label">
            {' '}
            {t('Report.dischargeQ')} {(total_Q * qFactor).toFixed(3)} {flowUnit} (&plusmn;{' '}
            {(total_q_std * qFactor).toFixed(2)} {flowUnit})
          </h3>
          <div className={`top-left${vertical ? '-vertical' : ''}`}>
            <div className={`top-left-medition-info${vertical ? '-vertical' : ''}`}>
              <h4 className="mt-1">
                {' '}
                {(measured_Q * 100).toFixed()}% {t('Results.measured')}{' '}
              </h4>
              <h4>
                {' '}
                {(interpolated_Q * 100).toFixed()} % {t('Results.interpolated')}{' '}
              </h4>
              <h3 className="mt-2 report-section-title-1">
                {' '}
                {t('Results.alpha')} {alpha}{' '}
              </h3>
              <h3 className="mt-1 report-section-title-1 mb-2">
                {' '}
                {t('Results.stationNumber')} {num_stations}{' '}
              </h3>
            </div>
            <div className={`image-and-svg-container ${vertical ? '-vertical' : ''}`}>
              <ImageResults
                reportFactor={factor}
                reportWidth={width}
                reportHeight={height}
                isReport={true}
                sectionIndex={index}
              />
            </div>
          </div>
        </div>

        <div id="report-section-top-right-container">
          <AllInOne width={450} height={550} index={index} isReport={true}></AllInOne>
        </div>
      </div>
      <ReportSectionTable data={data}></ReportSectionTable>
    </div>
  );
};
