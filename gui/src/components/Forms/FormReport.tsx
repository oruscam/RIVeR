import { useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useForm } from 'react-hook-form';
import { useProjectSlice, useSectionSlice } from '../../hooks';
import { dateToStringDate } from '../../helpers';
import { defaultMeasurementDate } from '../../helpers/dateFunctions';
import '../../index.css';
import { SavedReportBlock } from './Components/SavedReportBlock';
import { summarizeReport } from '../../helpers/reportSummary';
import { useTranslation } from 'react-i18next';
import { useWizard } from 'react-use-wizard';
import { UNITS } from '../../constants/constants';
import { scrollBehavior } from '../../helpers/motion';

export const FormReport = ({
  savedPath,
  setSavedPath,
}: {
  /** Where the report was written, or null while there is no file for the current details. */
  savedPath: string | null;
  setSavedPath: React.Dispatch<React.SetStateAction<string | null>>;
}) => {
  const { video, onProjectDetailsChange, projectDetails, onSetDefaultProjectState } = useProjectSlice();
  const { sections } = useSectionSlice();
  const headline = summarizeReport(
    { sections, step: video.parameters.step, fps: video.data.fps },
    projectDetails.unitSistem || 'si'
  );
  const flowUnit = projectDetails.unitSistem === 'imperial' ? UNITS.IMPERIAL.FLOW : UNITS.SI.FLOW;
  const { creation } = video.data;
  const { t } = useTranslation();

  const today = new Date();
  const defaultDate = defaultMeasurementDate(projectDetails.meditionDate, creation, today);

  const [meditionDate, setMeditionDate] = useState<Date>(defaultDate);
  const [unitSistem, setUnitSistem] = useState<string>(projectDetails.unitSistem || 'si');
  const { register, setValue } = useForm({
    defaultValues: {
      riverName: projectDetails.riverName,
      site: projectDetails.site,
      unitSistem: projectDetails.unitSistem,
    },
  });

  useEffect(() => {
    if (projectDetails.unitSistem && projectDetails.unitSistem !== unitSistem) {
      setUnitSistem(projectDetails.unitSistem);
      setValue('unitSistem', projectDetails.unitSistem);
    }
  }, [projectDetails.unitSistem, unitSistem, setValue]);

  const { goToStep } = useWizard();

  // const handleRadioChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  //   setUnitSistem(event.target.value);
  // };

  const onHandleDataChange = (
    event: React.KeyboardEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement>
  ) => {
    if ((event as React.KeyboardEvent<HTMLInputElement>).key === 'Enter' || event.type === 'blur') {
      event.preventDefault();
      const value = (event.target as HTMLInputElement).value;
      const id = (event.target as HTMLInputElement).id;

      if (value === '') {
        return;
      }
      if (id === 'river-name') {
        onProjectDetailsChange({
          riverName: value,
          unitSistem: unitSistem,
          meditionDate: dateToStringDate(meditionDate),
        });
        setSavedPath(null);
      } else if (id === 'river-site') {
        onProjectDetailsChange({
          site: value,
          unitSistem: unitSistem,
          meditionDate: dateToStringDate(meditionDate),
        });
        setSavedPath(null);
      }
    }
  };

  useEffect(() => {
    onProjectDetailsChange({
      meditionDate: dateToStringDate(meditionDate),
      unitSistem: unitSistem,
    });
    setSavedPath(null);
    // onProjectDetailsChange is recreated every render; adding it directly would re-run this
    // effect (and hide the just-shown success message) on every unrelated parent re-render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meditionDate, unitSistem, setSavedPath]);

  const handleShowInFolder = () => {
    if (savedPath) window.ipcRenderer.invoke('show-item-in-folder', { filePath: savedPath });
  };

  const handleNewProject = () => {
    onSetDefaultProjectState();
    goToStep(0);
  };

  useEffect(() => {
    if (savedPath) {
      const el = document.getElementById('successful-message');
      if (el) {
        el.scrollIntoView({ behavior: scrollBehavior() });
      }
    }
  }, [savedPath]);

  return (
    <div className="body">
      <form className="form-report" onSubmit={(e) => e.preventDefault()}>
        <div className="summary-result">
          <p className="summary-result-q">
            {headline.totalQ.toFixed(2)} <small>{flowUnit}</small>
          </p>
          <p className="summary-result-sub">
            {t('Report.Panel.totalDischarge', { defaultValue: 'Total discharge' })} ·{' '}
            {t('Report.Panel.sectionCount', {
              count: headline.sectionCount,
              defaultValue_one: '{{count}} section',
              defaultValue_other: '{{count}} sections',
            })}{' '}
            ·{' '}
            {t('Report.Panel.techniqueCount', {
              count: headline.techniqueCount,
              defaultValue_one: '{{count}} technique',
              defaultValue_other: '{{count}} techniques',
            })}
          </p>
        </div>

        <hr className="panel-rule" />
        <p className="panel-group">{t('Report.Panel.details', { defaultValue: 'Report details' })}</p>

        <div className="field-row field-row-top">
          <label className="field-row-label" htmlFor="river-name">
            {t('Report.Form.riverName')}
          </label>
          <span className="summary-control">
            <input
              type="text"
              required
              className="field field-text"
              {...register('riverName')}
              id="river-name"
              onBlur={onHandleDataChange}
              onKeyDown={onHandleDataChange}
              onChange={(e) => {
                onProjectDetailsChange({
                  riverName: e.target.value,
                  unitSistem: unitSistem,
                  meditionDate: dateToStringDate(meditionDate),
                });
                setSavedPath(null);
              }}
            />
          </span>
        </div>

        <div className="field-row field-row-top">
          <label className="field-row-label" htmlFor="river-site">
            {t('Report.Form.riverLocation')}
          </label>
          <span className="summary-control">
            <input
              type="text"
              required
              className="field field-text"
              {...register('site')}
              id="river-site"
              onBlur={onHandleDataChange}
              onKeyDown={onHandleDataChange}
              onChange={(e) => {
                onProjectDetailsChange({
                  site: e.target.value,
                  unitSistem: unitSistem,
                  meditionDate: dateToStringDate(meditionDate),
                });
                setSavedPath(null);
              }}
            />
          </span>
        </div>

        <div className="field-row field-row-top">
          <label className="field-row-label" htmlFor="river-date">
            {t('Report.Form.date')}
          </label>
          <span className="summary-control">
            <DatePicker
              id="river-date"
              className="field field-text"
              selected={meditionDate}
              onChange={(date) => setMeditionDate(date ?? new Date())}
              maxDate={today}
              dateFormat="dd/MM/yyyy HH:mm"
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={15}
            />
          </span>
        </div>

        {savedPath && (
          <SavedReportBlock
            filePath={savedPath}
            onShowInFolder={handleShowInFolder}
            onNewAnalysis={handleNewProject}
          />
        )}
      </form>
    </div>
  );
};
