import { useEffect, useRef } from 'react';
import { useDataSlice, useUiSlice } from '../../hooks';
import { GRAPHS } from '../../constants/constants';
import { testPlotSvg } from './testPlotSvg';
import { useTranslation } from 'react-i18next';
import { getCSSVar } from '../../helpers/getCSSVar';

export const TestPlot = ({ showMedian, width: fixedWidth }: { showMedian: boolean; width?: number }) => {
  const svgRef = useRef(null);
  const { screenSizes, theme } = useUiSlice();
  const { quiver, images } = useDataSlice();
  const { t } = useTranslation();

  const { width: screenWidth } = screenSizes;
  const graphWidth =
    fixedWidth ??
    (screenWidth * GRAPHS.PLOT_TEST_PROPORTION > GRAPHS.MIN_WIDTH
      ? screenWidth * GRAPHS.PLOT_TEST_PROPORTION
      : GRAPHS.MIN_WIDTH);

  useEffect(() => {
    if (quiver && svgRef.current) {
      const accentColor = getCSSVar('--accent-color');
      const textColor = getCSSVar('--primary-text-color');

      // Compute global axis limits across all frames so the axes stay fixed
      // while navigating frames. v is inverted in testPlotSvg so we invert here too.
      let axisLimits: { uMin: number; uMax: number; vMin: number; vMax: number } | undefined;
      if (!quiver.test) {
        const allU = (quiver.u as number[][]).flat();
        const allV = (quiver.v as number[][]).flat().map((d) => -d);
        const minOf = (arr: number[]) => arr.reduce((a, b) => Math.min(a, b), Infinity);
        const maxOf = (arr: number[]) => arr.reduce((a, b) => Math.max(a, b), -Infinity);
        axisLimits = {
          uMin: minOf(allU),
          uMax: maxOf(allU),
          vMin: minOf(allV),
          vMax: maxOf(allV),
        };
      }

      testPlotSvg({
        svgElement: svgRef.current,
        quiver: {
          u: quiver.test
            ? (quiver.u as number[])
            : showMedian
              ? (quiver.u_median as number[])
              : (quiver.u[images.active] as number[]),
          v: quiver.test
            ? (quiver.v as number[])
            : showMedian
              ? (quiver.v_median as number[])
              : (quiver.v[images.active] as number[]),
        },
        t,
        accentColor,
        textColor,
        axisLimits,
      });
    }
  }, [quiver, graphWidth, images.active, showMedian, theme, t]);

  return (
    <div>{quiver && <svg ref={svgRef} width={graphWidth} height={graphWidth * 0.8} id="quiver-test-plot" />}</div>
  );
};
