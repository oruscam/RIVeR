import { WizardButtons } from '../components';
import {
  Sheet,
  ReportHeader,
  SectionBlock,
  TableContinuation,
  MethodBlock,
  SnapshotStrip,
  ProcessingBlock,
  Colophon,
  hasCalibration,
} from '../components/Report';
import './pages.css';
import { useDataSlice, useIpcamSlice, useProjectSlice, useSectionSlice } from '../hooks';
import { FormReport } from '../components/Forms/index';
import { REPORT_FLOW, REPORT_SHEET } from '../constants/constants';
import { buildReportModel, appliedCorrections, summaryRows } from '../helpers/reportModel';
import { frameBox, frameFactor } from '../helpers/reportLayout';
import { paginate, stationChunks } from '../helpers/reportFlow';
import { useTranslation } from 'react-i18next';
import { useLayoutEffect, useRef, useState } from 'react';
import { FormHeader } from '../components/Forms/Components';

const convertImageToDataURI = (url: string, quality: number, maxWidth: number) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/webp', quality));
      } catch (e) {
        reject(e);
      }
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
  const showCalibration = hasCalibration(type, cameraSolution !== null);
  const title = `${projectDetails.riverName} @ ${projectDetails.site}`;
  const date = projectDetails.meditionDate ?? '';

  const { width: videoWidth, height: videoHeight } = video.data;
  const frame = frameBox(videoWidth, videoHeight, REPORT_FLOW.FRAME_WIDTH, REPORT_FLOW.FRAME_MAX_HEIGHT);
  const factor = frameFactor(videoWidth, videoHeight, video.parameters.factor, frame);

  type Block = { id: string; render: (measure: boolean) => React.ReactNode };
  const blocks: Block[] = [
    {
      id: 'header',
      render: () => (
        <ReportHeader model={model} summary={summary} applied={applied} footage={type} version={version} />
      ),
    },
  ];
  model.sections.forEach((result) => {
    const [first, ...rest] = stationChunks(result.numStations);
    blocks.push({
      id: `section-${result.index}`,
      render: (measure) => (
        <SectionBlock result={result} rowEnd={first[1]} frame={frame} factor={factor} measure={measure} />
      ),
    });
    rest.forEach(([start, end]) =>
      blocks.push({
        id: `section-${result.index}-${start}`,
        render: () => <TableContinuation result={result} rowStart={start} rowEnd={end} />,
      })
    );
  });
  blocks.push(
    { id: 'method', render: (measure) => <MethodBlock showCalibration={showCalibration} measure={measure} /> },
    { id: 'snapshots', render: () => <SnapshotStrip /> },
    { id: 'processing', render: () => <ProcessingBlock model={model} /> }
  );

  // Heights are measured in a hidden column of the page body's width, so translated labels that wrap
  // push a block to the next page instead of overflowing it.
  const measureRef = useRef<HTMLDivElement>(null);
  const warnedRef = useRef<Set<string>>(new Set());
  const [heights, setHeights] = useState<Record<string, number>>({});
  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const next: Record<string, number> = {};
    el.querySelectorAll<HTMLElement>('[data-block]').forEach((b) => {
      const id = b.dataset.block as string;
      next[id] = b.offsetHeight;
      if (next[id] > REPORT_FLOW.BODY_HEIGHT && !warnedRef.current.has(id)) {
        warnedRef.current.add(id);
        console.warn(`Report block "${id}" is ${next[id]}px, taller than the page body; it will be clipped.`);
      }
    });
    setHeights((prev) => {
      const keys = Object.keys(next);
      const same = keys.length === Object.keys(prev).length && keys.every((k) => prev[k] === next[k]);
      return same ? prev : next;
    });
  });
  const pages = paginate(
    blocks.map((b) => ({ id: b.id, height: heights[b.id] ?? REPORT_FLOW.FALLBACK_BLOCK_HEIGHT })),
    REPORT_FLOW.BODY_HEIGHT,
    REPORT_FLOW.GAP
  );
  const byId = new Map(blocks.map((b) => [b.id, b]));

  const [savedPath, setSavedPath] = useState<string | null>(null);

  const generateHTML = async () => {
    onSetAnalizing(true);
    try {
      onSaveProjectDetails();
      const live = document.getElementById('report-html-container');
      if (!live) return;
      // Rewrite a copy so the on-screen preview keeps its file:// sources and stays in sync with React.
      const input = live.cloneNode(true) as HTMLElement;
      const images = Array.from(input.getElementsByTagName('img'));
      const imageDataURIs = await Promise.all(
        images.map((img) =>
          // One unreadable image must not abort the export: keep its original source.
          convertImageToDataURI(img.src, REPORT_SHEET.IMAGE_QUALITY, REPORT_SHEET.IMAGE_MAX_WIDTH).catch(() => img.src)
        )
      );
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
  <title>${escapeHtml(title)} · ${escapeHtml(date)}</title>
  <style>${styles}</style>
</head>
<body style="margin:0">
  ${input.outerHTML}
</body>
</html>`;

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const arrayBuffer = await blob.arrayBuffer();
      // Only a real write counts: cancelling the Save dialog resolves with no path.
      const result = (await window.ipcRenderer.invoke('save-report-html', { arrayBuffer })) as
        | { filePath: string | null }
        | undefined;
      setSavedPath(result?.filePath ?? null);
    } finally {
      onSetAnalizing(false);
    }
  };

  return (
    <div className="regular-page">
      <div className="media-container">
        <div id="report-html-page">
          <div id="report-html-container" className="report-doc" data-theme="light" data-theme-scope>
            {pages.map((ids, i) => (
              <Sheet
                key={i}
                page={i + 1}
                pages={pages.length}
                title={title}
                date={date}
                colophon={<Colophon version={version} />}
              >
                {ids.map((id) => (
                  <div key={id} className="sheet-block">
                    {byId.get(id)!.render(false)}
                  </div>
                ))}
              </Sheet>
            ))}
          </div>
          <div ref={measureRef} className="report-doc report-measure" data-theme="light" aria-hidden="true">
            {blocks.map((b) => (
              <div key={b.id} data-block={b.id} className="sheet-block">
                {b.render(true)}
              </div>
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
