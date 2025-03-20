import { useTranslation } from "react-i18next";
import { REPORT_IMAGES } from "../../constants/constants";
import { formatNumberToPrecision4, getUnit } from "../../helpers";
import { useProjectSlice, useSectionSlice } from "../../hooks";
import { factor } from "../../types";
import { IpcamPixelTransformation } from "./IpcamPixelTransformation";
import { ObliquePixelTransformation } from "./ObliquePixelTransformation";

interface PixelTransformationProps {
  factor: factor;
  videoWidth: number;
  videoHeight: number;
}

export const PixelTransformation = ({
  factor,
  videoHeight,
  videoWidth,
}: PixelTransformationProps) => {
  const { t } = useTranslation();
  const { sections } = useSectionSlice();
  const { size } = sections[0].pixelSize;
  const { projectDetails, type } = useProjectSlice();
  const { unitSistem } = projectDetails;

  const factorIpcam = {
    x: videoWidth / REPORT_IMAGES.IMAGES_IPCAM_WIDTH,
    y: videoHeight / REPORT_IMAGES.IMAGES_IPCAM_HEIGHT,
  };

  return (
    <>
      <h2 className="report-title-field mt-4">
        {" "}
        {t("Report.pixelTransformation")}{" "}
      </h2>
      <div id="report-pixel-transformation-container">
        {type === "uav" ? (
          <>
            <div id="transformation-uav">
              <p> {t("PixelSize.title")} </p>
              <p>
                {" "}
                {formatNumberToPrecision4(size)}
                {getUnit(unitSistem, "longitude")}{" "}
              </p>
            </div>
            <div id="transformation-uav-last-child"></div>
          </>
        ) : type === "oblique" ? (
          <ObliquePixelTransformation factor={factor} />
        ) : (
          <IpcamPixelTransformation factor={factorIpcam} />
        )}
      </div>
    </>
  );
};
