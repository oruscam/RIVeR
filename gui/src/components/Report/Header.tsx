import { Icon } from '../Icon';
import './report.css';
import { drone, oblique, ipcam } from '../../assets/icons/icons.js';
import { useSectionSlice } from '../../hooks/useSectionSlice.js';
import { useProjectSlice } from '../../hooks/useProjectSlice.js';
import { getUnit } from '../../helpers/unitSistem.js';
import { UNIT_CONVERSIONS } from '../../constants/constants';

export const Header = () => {
  const { sections } = useSectionSlice();
  const { projectDetails, type } = useProjectSlice();
  const { riverName, site, meditionDate, unitSistem } = projectDetails;

  const divider = sections.length;

  const sum = sections.reduce((acc, section) => {
    if (section.data) {
      return acc + section.data.total_Q;
    }
    return acc;
  }, 0);

  const qF = unitSistem === 'imperial' ? UNIT_CONVERSIONS.M3_TO_FT3 : 1;
  const average = (sum / (divider !== 0 ? divider : 1)) * qF;

  const titleText = `${riverName}@${site}`;
  const titleFontSize = titleText.length > 20
    ? `${Math.max(1.0, 2 - (titleText.length - 20) * 0.04)}em`
    : undefined;

  return (
    <div id="report-header-container">
      <div id="header-icon-container">
        <Icon path={type === 'uav' ? drone : type === 'oblique' ? oblique : ipcam} id="header-icon" />
      </div>
      <div id="header-title-container">
        <h1 className="header-title-text mt-1" style={titleFontSize ? { fontSize: titleFontSize } : {}}>
          {' '}
          {riverName}@{site}
        </h1>
        <h3 id="header-title-date"> {meditionDate}</h3>
      </div>
      <div id="header-total">
        <h1 className="header-title-text">
          Total Q: {average.toFixed(2)} {getUnit(unitSistem, 'flow')}
        </h1>
      </div>
    </div>
  );
};
