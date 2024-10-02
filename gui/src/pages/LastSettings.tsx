import { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FieldValues, useForm } from "react-hook-form";
import { useProjectSlice } from "../hooks";
import { dateToStringDate } from "../helpers";
import { useWizard } from "react-use-wizard";
import './pages.css';
import { WizardButtons } from "../components";

export const LastSettings = () => {
  const { nextStep } = useWizard();
  const { video, onClickFinish } = useProjectSlice();
  const { creation } = video.data

  const today = new Date();
  const [meditionDate, setMeditionDate] = useState<Date>( new Date((creation)) );
  const { register, handleSubmit } = useForm({
    defaultValues: {
      riverName: '',
      site: '',
      unitSistem: 'si'

  }});

  const onSubmit = (values: FieldValues) => {
    if(meditionDate === null) {
      setMeditionDate(new Date((creation))); // Asigna la fecha por defecto
    }
    onClickFinish({
      riverName: values.riverName,
      site: values.site,
      unitSistem: values.unitSistem,
      meditionDate: dateToStringDate(meditionDate),
    });
    nextStep();
  }

  return (
    <div id='last-settings-container'>
      <form id="last-settings-form" onSubmit={handleSubmit(onSubmit)}>
      <div className="last-settings-form-field-container">
          <label> River's Name </label>
          <input type="text" required {...register('riverName')} />
        </div>
        <div className="last-settings-form-field-container">
          <label> Site </label>
          <input type="text" required {...register('site')} />
        </div>
        <div className="last-settings-form-field-container">
          <label id="label-unit-sistem"> Unit Sistem </label>

          <div className="last-settings-form-field-radio">
            <label> SI </label>
            <input type="radio" value="si" {...register('unitSistem')} />
          </div>

          <div className="last-settings-form-field-radio">
            <label> Imperial </label>
            <input type="radio" value="imperial" {...register('unitSistem')} />
          </div>
        </div>

        <div className="last-settings-form-field-container">
          <label> Measurement Date </label>
          <DatePicker
            selected={meditionDate}
            onChange={(date) => setMeditionDate(date ?? new Date())}
            maxDate={today}
            dateFormat="dd/MM/yyyy HH:mm"
            className="custom-datepicker"
            showTimeSelect
            timeFormat="HH:mm"
            timeIntervals={15}
          />
        </div>

        <button type="submit" id='button-send'> Send </button>
      </form>
      <WizardButtons></WizardButtons>
    </div>
  )
}
