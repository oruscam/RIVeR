import { useTranslation } from 'react-i18next';
import logo from '../../assets/logo_footer.png';
import './report.css';

interface SheetProps {
  page: number;
  pages: number;
  /** "River @ Site" */
  title: string;
  /** Measurement date as entered. */
  date: string;
  children: React.ReactNode;
}

/** One printed A4 page. Report.tsx decides which blocks fit; the body never grows past the page. */
export const Sheet = ({ page, pages, title, date, children }: SheetProps) => {
  const { t } = useTranslation();
  return (
    <section className="sheet">
      <div className="sheet-body">{children}</div>
      <footer className="sheet-footer">
        <span className="sheet-who">
          <img className="sheet-logo" src={logo} alt="RIVeR" />
          <span>
            {title} · {date}
          </span>
        </span>
        <span>
          {t('Report.Doc.page', { defaultValue: 'page' })} {page} / {pages}
        </span>
      </footer>
    </section>
  );
};
