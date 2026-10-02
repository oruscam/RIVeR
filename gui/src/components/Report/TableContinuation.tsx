import { useTranslation } from 'react-i18next';
import type { SectionResult } from '../../helpers/reportModel';
import { StationTable } from './StationTable';

/** A later part of a long station table, on a page of its own if needed. */
export const TableContinuation = ({
  result,
  rowStart,
  rowEnd,
}: {
  result: SectionResult;
  rowStart: number;
  rowEnd: number;
}) => {
  const { t } = useTranslation();
  return (
    <article className="sec">
      <div className="sec-head">
        <h2 className="sec-name">
          {result.name}{' '}
          <span className="doc-meta">({t('Report.Doc.continued', { defaultValue: 'continued' })})</span>
        </h2>
      </div>
      <StationTable storeIndex={result.index} rowStart={rowStart} rowEnd={rowEnd} />
    </article>
  );
};
