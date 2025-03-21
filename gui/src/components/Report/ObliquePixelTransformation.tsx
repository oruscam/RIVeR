import { useEffect, useRef } from "react";
import { useMatrixSlice, useProjectSlice } from "../../hooks";
import { REPORT_IMAGES, UNITS } from "../../constants/constants";
import { factor } from "../../types";
import { obliqueSvg } from "../Graphs";
import * as d3 from "d3";
import { useTranslation } from "react-i18next";

interface ObliquePixelTransformationProps {
  factor: factor;
}

export const ObliquePixelTransformation = ({
  factor,
}: ObliquePixelTransformationProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { firstFramePath, projectDetails } = useProjectSlice();
  const { obliquePoints } = useMatrixSlice();
  const { coordinates, distances } = obliquePoints;
  const { t } = useTranslation();

  const { unitSistem } = projectDetails;

  useEffect(() => {
    d3.select(svgRef.current).selectAll("*").remove();
    if (svgRef.current) {
      obliqueSvg({
        factor,
        coordinates,
        distances,
        svgElement: svgRef.current,
        width: REPORT_IMAGES.IMAGES_WIDTH,
        height: REPORT_IMAGES.IMAGES_HEIGHT,
      });
    }
  }, [factor, coordinates, distances]);

  return (
    <div className="pixel-transformation-with-image">
      <div className="image-and-svg-container">
        <img
          src={firstFramePath}
          width={REPORT_IMAGES.IMAGES_WIDTH}
          height={REPORT_IMAGES.IMAGES_HEIGHT}
          className="image-border-radius"
        />
        <svg ref={svgRef} className="svg-in-image-container" />
      </div>
      <div id="oblique-transformation-info">
        <table>
          <thead>
            <tr>
              <th> {t("CorntrolPoints.distance")} </th>
              <th> {t("CorntrolPoints.length")} </th>
            </tr>
          </thead>
          <tbody>
            <tr></tr>
            <tr>
              <td> 1-2 </td>
              <td>
                {" "}
                {distances.d12}{" "}
                {unitSistem === "si"
                  ? UNITS.SI.LONGITUDE
                  : UNITS.IMPERIAL.LONGITUDE}
              </td>
            </tr>
            <tr>
              <td> 2-3 </td>
              <td>
                {" "}
                {distances.d23}{" "}
                {unitSistem === "si"
                  ? UNITS.SI.LONGITUDE
                  : UNITS.IMPERIAL.LONGITUDE}
              </td>
            </tr>
            <tr>
              <td> 3-4 </td>
              <td>
                {" "}
                {distances.d34}{" "}
                {unitSistem === "si"
                  ? UNITS.SI.LONGITUDE
                  : UNITS.IMPERIAL.LONGITUDE}
              </td>
            </tr>
            <tr>
              <td> 4-1 </td>
              <td>
                {" "}
                {distances.d41}{" "}
                {unitSistem === "si"
                  ? UNITS.SI.LONGITUDE
                  : UNITS.IMPERIAL.LONGITUDE}
              </td>
            </tr>
            <tr>
              <td> 1-3 </td>
              <td>
                {" "}
                {distances.d13}{" "}
                {unitSistem === "si"
                  ? UNITS.SI.LONGITUDE
                  : UNITS.IMPERIAL.LONGITUDE}
              </td>
            </tr>
            <tr>
              <td> 2-4 </td>
              <td>
                {" "}
                {distances.d24}{" "}
                {unitSistem === "si"
                  ? UNITS.SI.LONGITUDE
                  : UNITS.IMPERIAL.LONGITUDE}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
