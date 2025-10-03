import { useEffect, useRef } from "react";
import { useDataSlice, useUiSlice } from "../../hooks";
import { GRAPHS } from "../../constants/constants";
import { testPlotSvg } from "./testPlotSvg";
import { useTranslation } from "react-i18next";

export const TestPlot = () => {
  const svgRef = useRef(null);
  const { screenSizes } = useUiSlice();
  const { quiver } = useDataSlice();
  const { t } = useTranslation();

  const { width: screenWidth } = screenSizes;
  const graphWidth =
    screenWidth * GRAPHS.PLOT_TEST_PROPORTION > GRAPHS.MIN_WIDTH
      ? screenWidth * GRAPHS.PLOT_TEST_PROPORTION
      : GRAPHS.MIN_WIDTH;

  useEffect(() => {
    if (quiver && svgRef.current) {
      testPlotSvg({
        svgElement: svgRef.current,
        quiver: {
          u: quiver.u as number[], // In this point, always quiver.u i flat array
          v: quiver.v as number[], // In this point, always quiver.v i flat array
        },
        t,
      });
    }
  }, [quiver, graphWidth]);

  return (
    <div>
      {quiver && (
        <svg
          ref={svgRef}
          width={graphWidth}
          height={graphWidth * 0.8}
          id="quiver-test-plot"
        />
      )}
    </div>
  );
};
