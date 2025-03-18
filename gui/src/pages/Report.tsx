import { Progress, WizardButtons } from "../components";
import {
  ProcessedRange,
  VideoInfo,
  ReportSection,
  Header,
  Summary,
  PixelTransformation,
  ProcessingParameters,
  Footer,
} from "../components/Report";
import "./pages.css";
import { useDataSlice, useProjectSlice, useSectionSlice } from "../hooks";
import { FormReport } from "../components/Forms/index";
import { REPORT_IMAGES } from "../constants/constants";
import { useTranslation } from "react-i18next";

const convertImageToDataURI = (url: string, quality = 1.0) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const maxWidth = 1920;
      const scaleFactor = maxWidth / img.width;
      const canvas = document.createElement("canvas");
      canvas.width = maxWidth;
      canvas.height = img.height * scaleFactor;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataURI = canvas.toDataURL("image/webp", quality);
      resolve(dataURI);
    };
    img.onerror = reject;
    img.src = url;
  });
};

export const Report = () => {
  const { t } = useTranslation();
  const { sections } = useSectionSlice();
  const { onSetAnalizing } = useDataSlice();
  const { onSaveProjectDetails, video } = useProjectSlice();
  const { width: videoWidth, height: videoHeight } = video.data;

  const generateHTML = async () => {
    onSetAnalizing(true);
    onSaveProjectDetails();
    const input = document.getElementById("report-html-container");
    if (input) {
      // Convert all images to data URIs
      const images = Array.from(input.getElementsByTagName("img"));
      const imagePromises = images.map((img) =>
        convertImageToDataURI(img.src, 0.1),
      );
      const imageDataURIs = await Promise.all(imagePromises);

      // Replace image sources with data URIs
      images.forEach((img, index) => {
        img.src = imageDataURIs[index] as string;
      });

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Report</title>
          <link rel="stylesheet" href="/src/components/Report/report.css">
          <style>
            ${Array.from(document.styleSheets)
              .map((styleSheet) => {
                try {
                  return Array.from(styleSheet.cssRules)
                    .map((rule) => rule.cssText)
                    .join("");
                } catch (e) {
                  console.error(e);
                  return "";
                }
              })
              .join("")}
          </style>
        </head>
        <body>
          ${input.outerHTML}
        </body>
        </html>
      `;

      // Save the HTML file
      const blob = new Blob([htmlContent], { type: "text/html" });
      const arrayBuffer = await blob.arrayBuffer();

      await window.ipcRenderer.invoke("save-report-html", { arrayBuffer });
    }
    onSetAnalizing(false);
  };

  const factor = {
    x: videoWidth / REPORT_IMAGES.IMAGES_WIDTH,
    y: videoHeight / REPORT_IMAGES.IMAGES_HEIGHT,
  };

  return (
    <div className="regular-page">
      <div className="media-container">
        <div id="report-html-page">
          <div id="report-html-container">
            <Header />
            <VideoInfo />
            <ProcessedRange />
            <div id="report-section-wrapper">
              <h2 className="report-title-field mt-1">
                {" "}
                {t("CrossSections.title")} (s)
              </h2>
              {[...sections.keys()].map((index) => (
                <ReportSection key={index} index={index} factor={factor} />
              ))}
            </div>
            <Summary />
            <PixelTransformation
              factor={factor}
              videoWidth={videoWidth}
              videoHeight={videoHeight}
            />
            <ProcessingParameters />
            <Footer />
          </div>
        </div>
      </div>
      <div className="form-container">
        <Progress />
        <FormReport />
        <WizardButtons onClickNext={generateHTML} />
      </div>
    </div>
  );
};
