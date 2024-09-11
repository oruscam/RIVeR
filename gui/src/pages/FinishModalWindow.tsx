import { useState, useEffect } from 'react';
import { FieldValues, useForm } from 'react-hook-form';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { dateToStringDate } from '../helpers';


export const FinishModalWindow = () => {
  const today = new Date();
  const [meditionDate, setMeditionDate] = useState<Date>(today);
  let defaultDate: string // Fecha por defecto

  const { register, handleSubmit } = useForm({
    defaultValues: {
      riverName: '',
      site: '',
      unitSistem: 'si'
    }
  });

  useEffect(() => {
    const { ipcRenderer } = window;
    ipcRenderer.on('creation-date', (_event, arg) => {
      if( arg !== ''){
        console.log(arg)
        defaultDate = arg; // Asigna el valor de la fecha por defecto
        setMeditionDate(new Date(arg));
      }
    });
  }, []);

  const onSubmit = (values: FieldValues) => {
    if(meditionDate === null) {
      setMeditionDate(new Date((defaultDate))); // Asigna la fecha por defecto
    }
    
    const ipcRenderer = window.ipcRenderer;
    ipcRenderer.send('close-modal-window', {...values, meditionDate: dateToStringDate(meditionDate)});
    window.close();
  };


  return (
    <div id="finish-modal-window" data-theme>
      <form id="form-modal-container" onSubmit={handleSubmit(onSubmit)}>
        <div className="form-modal-field-container">
          <label> River's Name </label>
          <input type="text" required {...register('riverName')} />
        </div>
        <div className="form-modal-field-container">
          <label> Site </label>
          <input type="text" required {...register('site')} />
        </div>
        <div className="form-modal-field-container">
          <label id="label-unit-sistem"> Unit Sistem </label>

          <div className="form-modal-field-radio">
            <label> SI </label>
            <input type="radio" value="si" {...register('unitSistem')} />
          </div>

          <div className="form-modal-field-radio">
            <label> Imperial </label>
            <input type="radio" value="imperial" {...register('unitSistem')} />
          </div>
        </div>

        <div className="form-modal-field-container">
          <label> Medition Date </label>
          <DatePicker
            selected={meditionDate}
            onChange={(date) => setMeditionDate(date)}
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
    </div>
  );
};