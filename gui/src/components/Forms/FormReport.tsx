import { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useForm } from "react-hook-form";
import { useProjectSlice } from "../../hooks";
import { dateToStringDate, stringDateToDate } from "../../helpers";
import "../../index.css";
import { SuccessfulMessage } from "../Report";
import { useTranslation } from "react-i18next";

export const FormReport = () => {
  const { video, onProjectDetailsChange, projectDetails } = useProjectSlice();
  const { creation } = video.data;
  const { t } = useTranslation();

  const today = new Date();
  const defaultDate = projectDetails.meditionDate
    ? stringDateToDate(projectDetails.meditionDate)
    : creation !== undefined
      ? new Date(creation)
      : today;

  const [meditionDate, setMeditionDate] = useState<Date>(defaultDate);
  const [unitSistem, setUnitSistem] = useState<string>("si");
  const { register } = useForm({
    defaultValues: {
      riverName: projectDetails.riverName,
      site: projectDetails.site,
      unitSistem: projectDetails.unitSistem,
    },
  });

  const handleRadioChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUnitSistem(event.target.value);
  };

  const onHandleDataChange = (
    event:
      | React.KeyboardEvent<HTMLInputElement>
      | React.FocusEvent<HTMLInputElement>,
  ) => {
    if (
      (event as React.KeyboardEvent<HTMLInputElement>).key === "Enter" ||
      event.type === "blur"
    ) {
      event.preventDefault();
      const value = (event.target as HTMLInputElement).value;
      const id = (event.target as HTMLInputElement).id;

      if (value === "") {
        return;
      }
      if (id === "river-name") {
        onProjectDetailsChange({
          riverName: value,
          unitSistem: unitSistem,
          meditionDate: dateToStringDate(meditionDate),
        });
      } else if (id === "river-site") {
        onProjectDetailsChange({
          site: value,
          unitSistem: unitSistem,
          meditionDate: dateToStringDate(meditionDate),
        });
      }
    }
  };

  useEffect(() => {
    onProjectDetailsChange({
      meditionDate: dateToStringDate(meditionDate),
      unitSistem: unitSistem,
    });
  }, [meditionDate, unitSistem]);

  return (
    <>
      <h1 className="form-title"> {t('Report.Summary.title')} </h1>
      <form className="form-base-2">
        <div className="simple-input-container">
          <label>{t('Report.Form.riverName')}</label>
          <input
            type="text"
            required
            {...register("riverName")}
            id="river-name"
            onBlur={onHandleDataChange}
            onKeyDown={onHandleDataChange}
          />
        </div>

        <div className="simple-input-container">
          <label> {t('Report.Form.riverLocation')} </label>
          <input
            type="text"
            required
            {...register("site")}
            id="river-site"
            onBlur={onHandleDataChange}
            onKeyDown={onHandleDataChange}
          />
        </div>

        <div className="simple-input-container">
          <label id="label-unit-sistem"> {t('Report.Form.unitSistem')} </label>

          <div className="last-settings-form-field-radio">
            <label> {t('Report.Form.SI')} </label>
            <input
              type="radio"
              value="si"
              {...register("unitSistem")}
              id="river-medition-si"
              onChange={handleRadioChange}
            />
          </div>

          <div className="last-settings-form-field-radio">
            <label> {t('Report.Form.imperial')} </label>
            <input
              type="radio"
              value="imperial"
              {...register("unitSistem")}
              id="river-medition-imperial"
              onChange={handleRadioChange}
            />
          </div>
        </div>

        <div className="simple-input-container">
          <label> {t('Report.Form.date')} </label>
          <DatePicker
            selected={meditionDate}
            onChange={(date) => setMeditionDate(date ?? new Date())}
            maxDate={today}
            dateFormat="MM/dd/yyyy HH:mm"
            showTimeSelect
            timeFormat="HH:mm"
            timeIntervals={15}
          />
        </div>

        <SuccessfulMessage />
      </form>
    </>
  );
};
