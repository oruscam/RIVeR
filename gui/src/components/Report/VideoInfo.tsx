import { useTranslation } from "react-i18next";
import { formatTime, recortStringDate } from "../../helpers";
import { useProjectSlice } from "../../hooks";
import "./report.css";

export const VideoInfo = () => {
  const { video, projectDetails } = useProjectSlice();
  const { name, duration, fps, width, height } = video.data;
  const { meditionDate } = projectDetails;
  const { t } = useTranslation();

  return (
    <>
      <h2 className="report-title-field mt-2">{t("Report.VideoInfo.title")}</h2>
      <div id="report-video-info-container">
        <div className="report-grid-1">
          <div className="report-info-item">
            <span>{t("Report.VideoInfo.name")}</span>
          </div>
          <div className="report-info-item">
            <span>{t("Report.VideoInfo.duration")}</span>
          </div>
          <div className="report-info-item">
            <span>{t("Report.VideoInfo.resolution")}</span>
          </div>
          <div className="report-info-item">
            <span>{t("Report.VideoInfo.fps")}</span>
          </div>
          <div className="report-info-item">
            <span>{t("Report.VideoInfo.creationDate")}</span>
          </div>
          <div className="report-info-item">
            <span> {name} </span>
          </div>
          <div className="report-info-item">
            <span> {formatTime(duration)}s </span>
          </div>
          <div className="report-info-item">
            <span> {`${width}x${height}`} </span>
          </div>
          <div className="report-info-item">
            <span> {fps} </span>
          </div>
          <div className="report-info-item">
            <span> {recortStringDate(meditionDate)} </span>
          </div>
        </div>
      </div>
    </>
  );
};
