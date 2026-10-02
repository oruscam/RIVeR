import { WizardButtons } from '../components';
import { Sheet, Cover, SectionSheet, CalibrationSheet, FootageSheet, hasCalibration } from '../components/Report';
import './pages.css';
import { useDataSlice, useIpcamSlice, useProjectSlice, useSectionSlice } from '../hooks';
import { FormReport } from '../components/Forms/index';
import { REPORT_SHEET } from '../constants/constants';
import { buildReportModel, appliedCorrections, summaryRows } from '../helpers/reportModel';
import { buildSheets, frameBox, frameFactor } from '../helpers/reportLayout';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { FormHeader } from '../components/Forms/Components';

const convertImageToDataURI = (url: string, quality: number, maxWidth: number) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/webp', quality));
    };
    img.onerror = reject;
    img.src = url;
  });
};

const escapeHtml = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);

export const Report = () => {
  const { t } = useTranslation();
  const { onSetAnalizing } = useDataSlice();
  const { sections, summary: backendSummary } = useSectionSlice();
  const { onSaveProjectDetails, video, projectDetails, type } = useProjectSlice();
  const { cameraSolution } = useIpcamSlice();
  const version = import.meta.env.VITE_APP_VERSION ?? '';

  const model = buildReportModel({ sections, step: video.parameters.step, fps: video.data.fps });
  const summary = summaryRows(backendSummary, model);
  const applied = appliedCorrections({ ...video.parameters });
  const sheets = buildSheets(model, hasCalibration(type, cameraSolution !== null));
  const title = `${projectDetails.riverName} @ ${projectDetails.site}`;

  const { width: videoWidth, height: videoHeight } = video.data;
  const frame = frameBox(
    videoWidth,
    videoHeight,
    REPORT_SHEET.CONTENT_WIDTH,
    REPORT_SHEET.SECTION_FRAME_MAX_HEIGHT
  );
  const factor = frameFactor(videoWidth, videoHeight, video.parameters.factor, frame);

  const [savedPath, setSavedPath] = useState<string | null>(null);

  const generateHTML = async () => {
    onSetAnalizing(true);
    onSaveProjectDetails();
    const input = document.getElementById('report-html-container');
    if (input) {
      // Convert all images to data URIs
      const images = Array.from(input.getElementsByTagName('img'));
      const imagePromises = images.map((img) =>
        convertImageToDataURI(img.src, REPORT_SHEET.IMAGE_QUALITY, REPORT_SHEET.IMAGE_MAX_WIDTH)
      );
      const imageDataURIs = await Promise.all(imagePromises);

      // Replace image sources with data URIs
      images.forEach((img, index) => {
        img.src = imageDataURIs[index] as string;
      });

      const styles = Array.from(document.styleSheets)
        .map((styleSheet) => {
          try {
            return Array.from(styleSheet.cssRules)
              .map((rule) => rule.cssText)
              .join('');
          } catch (e) {
            console.error(e);
            return '';
          }
        })
        .join('');

      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(title)} · ${escapeHtml(projectDetails.meditionDate ?? '')}</title>
  <style>${styles}</style>
</head>
<body style="margin:0">
  ${input.outerHTML}
</body>
</html>`;

      // Save the HTML file
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const arrayBuffer = await blob.arrayBuffer();

      // Only a real write counts: cancelling the Save dialog resolves with no path.
      const result = (await window.ipcRenderer.invoke('save-report-html', { arrayBuffer })) as
        | { filePath: string | null }
        | undefined;
      setSavedPath(result?.filePath ?? null);
    }
    onSetAnalizing(false);
  };

  return (
    <div className="regular-page">
      <div className="media-container">
        <div id="report-html-page">
          <div id="report-html-container" className="report-doc" data-theme="light" data-theme-scope>
            {sheets.map((sheet, i) => (
              <Sheet key={i} page={i + 1} pages={sheets.length} title={title}>
                {sheet.kind === 'cover' && (
                  <Cover model={model} summary={summary} applied={applied} footage={type} version={version} />
                )}
                {sheet.kind === 'section' && (
                  <SectionSheet
                    result={model.sections[sheet.sectionIndex]}
                    rowStart={sheet.rowStart}
                    rowEnd={sheet.rowEnd}
                    continued={sheet.continued}
                    frame={frame}
                    factor={factor}
                  />
                )}
                {sheet.kind === 'calibration' && <CalibrationSheet />}
                {sheet.kind === 'footage' && <FootageSheet model={model} version={version} />}
              </Sheet>
            ))}
          </div>
        </div>
      </div>
      <div className="form-container results-wash">
        <FormHeader title={t('Report.Summary.title')} showSections={false} />
        <FormReport savedPath={savedPath} setSavedPath={setSavedPath} />
        <div className="footer">
          <WizardButtons
            onClickNext={generateHTML}
            nextLabel={t('Report.Panel.saveReport', { defaultValue: 'Save report' })}
          />
        </div>
      </div>
    </div>
  );
};
