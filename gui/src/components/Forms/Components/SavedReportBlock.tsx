import { useTranslation } from 'react-i18next';
import { LuCheck } from 'react-icons/lu';

/**
 * What the Summary panel shows once the report file really exists. Quiet, in
 * panel grammar: an accent check, the file name, and two real buttons.
 */
export const SavedReportBlock = ({
  filePath,
  onShowInFolder,
  onNewAnalysis,
}: {
  filePath: string;
  onShowInFolder: () => void;
  onNewAnalysis: () => void;
}) => {
  const { t } = useTranslation();
  const fileName = filePath.split(/[\\/]/).pop() ?? filePath;

  return (
    <div id="successful-message" className="summary-saved" role="status">
      <p className="summary-saved-head">
        <span className="summary-saved-check">
          <LuCheck size={13} strokeWidth={3} aria-hidden="true" />
        </span>
        {t('Report.Saved.title', { defaultValue: 'Report saved' })}
      </p>
      <p className="field-readonly panel-filename" title={filePath}>
        {fileName}
      </p>
      <div className="panel-actions">
        <button type="button" className="btn btn-secondary panel-action" onClick={onShowInFolder}>
          {t('Report.Saved.showInFolder', { defaultValue: 'Show in folder' })}
        </button>
        <button type="button" className="btn btn-secondary panel-action" onClick={onNewAnalysis}>
          {t('Report.Saved.newAnalysis', { defaultValue: 'Start new analysis' })}
        </button>
      </div>
    </div>
  );
};
