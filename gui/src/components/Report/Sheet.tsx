import { useTranslation } from 'react-i18next';

interface SheetProps {
  page: number;
  pages: number;
  /** "River @ Site" */
  title: string;
  children: React.ReactNode;
}

/** One printed A4 page. The body never grows past the page; layout.ts decides what fits. */
export const Sheet = ({ page, pages, title, children }: SheetProps) => {
  const { t } = useTranslation();
  return (
    <section className="sheet">
      <div className="sheet-body">{children}</div>
      <footer className="sheet-footer">
        <span>{title}</span>
        <span>
          {t('Report.Doc.page', { defaultValue: 'page' })} {page} / {pages}
        </span>
      </footer>
    </section>
  );
};
