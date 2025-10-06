import { useMemo } from 'react';
import { ColorBar, Error, Progress, Results as ResultsComponent, WizardButtons } from '../components';
import { VelocityVector } from '../components/Graphs';
import { useProjectSlice, useSectionSlice, useUiSlice } from '../hooks';
import { getVelocityLimits } from '../helpers';

export const Results = () => {
  const { screenSizes, seeAll } = useUiSlice();
  const { imageWidth: width, imageHeight: height, factor } = screenSizes;
  const { firstFramePath } = useProjectSlice();
  const { sections, activeSection } = useSectionSlice();

  const { max, min } = useMemo(() => {
    return getVelocityLimits(sections, activeSection);
  }, [sections, activeSection]);

  if (!width || !height || !factor) return null;
  return (
    <div className="regular-page">
      <div className="media-container">
        <div className="image-and-svg-container">
          <img src={firstFramePath} width={width} height={height} />
          <VelocityVector height={height} width={width} factor={factor} seeAll={seeAll} />
          <ColorBar min={min} max={max} />
        </div>
        <Error />
      </div>
      <div className="form-container">
        <Progress />
        <ResultsComponent />
        <WizardButtons formId="form-result" />
      </div>
    </div>
  );
};
