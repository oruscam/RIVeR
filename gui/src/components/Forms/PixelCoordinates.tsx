import { useFormContext } from "react-hook-form"
import { useDataSlice, useUiSlice } from "../../hooks";
import { getPointNames } from "../../helpers/index.ts";


export const PixelCoordinates = ({ modeName } : { modeName: string }) => {
    const { register, resetField } = useFormContext();
    const { onSetErrorMessage } = useUiSlice();
    const { onSetPoints } = useDataSlice();
    
    const { pointName1, pointName2 } = getPointNames(modeName);

    const handleInputField = ( event: React.KeyboardEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement> , nextFieldId: string ) => {
        if((event as React.KeyboardEvent<HTMLInputElement>).key  === 'Enter' || event.type === 'blur'){
            event.preventDefault()
            if( event.type !== 'blur'){
                document.getElementById(nextFieldId)?.focus()
            }

            const value = parseFloat((event.target as HTMLInputElement).value);
            const target = event.target as HTMLInputElement;

            if( value < 0){
                const error = {
                    [target.id]: {
                    type: "required",     
                    message: `The value ${target.id} must be greater than 0`
                    }
                };
                onSetErrorMessage(error)
                const fieldName = `${modeName}_${target.id}`
                resetField(fieldName)
                return
            }
  
            switch (target.id) {
                case `X_${pointName1}`:
                    onSetPoints(null, {point: value, position: "x1"})
                    break;
                
                case `Y_${pointName1}`:
                    onSetPoints(null, {point: value, position: "y1"})
                    break;
            
                case `X_${pointName2}`:
                    onSetPoints(null, {point: value, position: "x2"})
                    break;
            
                case `Y_${pointName2}`:
                    onSetPoints(null, {point: value, position: "y2"})
                    break;
                
                default:
                    break;
                }
        }
      }

  return (
    <>
        <h2 className="form-subtitle mt-2 mb-1" id="pixel-coordinates"> Pixel Coordinates </h2>

        <label className="read-only red" htmlFor={`X_${pointName1}`}> {`X ${pointName1}`} </label>
        <input  type="number"
                step="any"
                className="input-field"
                id={`X_${pointName1}`}
                {...register(`${modeName}_X_${pointName1}`)} 
                onKeyDown={(event) => handleInputField(event, `Y_${pointName1}`)}
                onBlur={(event) => handleInputField(event, `Y_${pointName1}`)}
        />

        <label className='read-only red' htmlFor={`Y_${pointName1}`}> {`Y ${pointName1}`}</label>
        <input  type='number' 
                step="any" className='input-field' 
                {...register(`${modeName}_Y_${pointName1}`)} 
                id={`Y_${pointName1}`} 
                onKeyDown={(event) => handleInputField(event, `X_${pointName2}`)}
                onBlur={(event) => handleInputField(event, `X_${pointName2}`)}

        />

        <label className='read-only green' htmlFor={`X_${pointName2}`}> {`X ${pointName2}`}</label> 
        <input type='number' 
                step="any" className='input-field' 
                {...register(`${modeName}_X_${pointName2}`)} 
                id={`X_${pointName2}`} 
                onKeyDown={(event) => handleInputField(event, `Y_${pointName2}`)}
                onBlur={(event) => handleInputField(event, `Y_${pointName2}`)}

        />

        <label className='read-only green' htmlFor={`Y_${pointName2}`}> {`Y ${pointName2}`}</label>
        <input  type='number' 
                    step="any" className='input-field' 
                    {...register(`${modeName}_Y_${pointName2}`)} 
                    id={`Y_${pointName2}`} 
                    onKeyDown={(event) => handleInputField(event, 'wizard-next')}
                    onBlur={(event) => handleInputField(event, 'wizard-next')}   
        />
    </>
  )
}
