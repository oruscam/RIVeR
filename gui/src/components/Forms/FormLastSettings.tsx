import { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useForm } from "react-hook-form";
import { useProjectSlice } from "../../hooks";
import { dateToStringDate } from "../../helpers";
import '../../index.css'

export const FormLastSettings = () => {
  const { video, onProjectDetailsChange } = useProjectSlice();
  const { creation } = video.data

  const today = new Date();
  const [meditionDate, setMeditionDate] = useState<Date>( new Date((creation)) );
  const [ unitSistem, setUnitSistem ] = useState<string>('si');
  const { register } = useForm({
    defaultValues: {
      riverName: '',
      site: '',
      unitSistem: 'si'
  }});


  const handleRadioChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUnitSistem(event.target.value);
  };

  const onHandleDataChange = ( event: React.KeyboardEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement> ) => {
    if ( (event as React.KeyboardEvent<HTMLInputElement>).key  === 'Enter' || event.type === 'blur' ){
      event.preventDefault()
      const value = (event.target as HTMLInputElement).value;
      const id = (event.target as HTMLInputElement).id;
      
      if (value === '') {
        return;
      }
      if ( id === 'river-name' ) {
        onProjectDetailsChange({
          riverName: value,
          unitSistem: unitSistem,
          meditionDate: dateToStringDate(meditionDate),
        })
      } else if ( id === 'river-site' ) {
        onProjectDetailsChange({
          site: value,
          unitSistem: unitSistem,
          meditionDate: dateToStringDate(meditionDate),
        })
      }
    }
  }

  useEffect(() => {
    onProjectDetailsChange({
      meditionDate: dateToStringDate(meditionDate),
      unitSistem: unitSistem,
    })
  }, [meditionDate, unitSistem])


  return (
    <>
      <h2 className="form-title"> Last Settings</h2>
      <form className="form-base-2">
        <div className="simple-input-container mt-5">
            <label> River's Name </label>
            <input type="text" required {...register('riverName')} id="river-name" onBlur={onHandleDataChange} onKeyDown={onHandleDataChange}/>
        </div>

        <div className="simple-input-container">
          <label> Site </label>
          <input type="text" required {...register('site')} id="river-site" onBlur={onHandleDataChange} onKeyDown={onHandleDataChange}/>
        </div>

        <div className="simple-input-container">
          <label id="label-unit-sistem"> Unit Sistem </label>

          <div className="last-settings-form-field-radio">
            <label> SI </label>
            <input type="radio" value="si" {...register('unitSistem')} id="river-medition-si" onChange={handleRadioChange}/>
          </div>

          <div className="last-settings-form-field-radio">
            <label> Imperial </label>
            <input type="radio" value="imperial" {...register('unitSistem')} id="river-medition-imperial" onChange={handleRadioChange} />
          </div>
        </div>

        <div className="simple-input-container">
          <label> Measurement Date </label>
          <DatePicker
            selected={meditionDate}
            onChange={(date) => setMeditionDate(date ?? new Date())}
            maxDate={today}
            dateFormat="dd/MM/yyyy HH:mm"
            showTimeSelect
            timeFormat="HH:mm"
            timeIntervals={15}
          />
        </div>
      </form>
    </>
  )
}
