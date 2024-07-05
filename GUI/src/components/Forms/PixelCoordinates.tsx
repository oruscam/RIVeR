import { useFormContext } from "react-hook-form"
import { useDataSlice, useUiSlice } from "../../hooks";
import { useEffect } from "react";
import { getPointNames } from "../../helpers/index.ts";


export const PixelCoordinates = ({ modeName } : { modeName: string }) => {
    const { register, setValue} = useFormContext();
    const { onSetErrorMessage } = useUiSlice();
    const { sections, activeSection, onSetPoints, projectDirectory } = useDataSlice();
    const { points } = sections[activeSection]
    
    const { pointName1, pointName2 } = getPointNames(modeName);

    const handleInputField = ( event: React.KeyboardEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement> , nextFieldId: string ) => {
        if((event as React.KeyboardEvent<HTMLInputElement>).key  === 'Enter' || event.type === 'blur'){
            event.preventDefault()
            if( event.type !== 'blur'){
                document.getElementById(nextFieldId)?.focus()
            }

            const value = parseFloat((event.target as HTMLInputElement).value);
            const target = event.target as HTMLInputElement;
            let error = {}
  
            switch (target.id) {
                case `X_${pointName1}`:
                    if( value >= 0){
                    if( value !== points[0].x){
                        onSetPoints([{x: value, y: points[0].y}, {x: points[1].x, y: points[1].y}], 1, 1)
                    }
                    } else {
                    setValue(`${modeName}_${target.id}`, points[0].x, {shouldValidate: true})
                    error = {
                        [target.id]: {
                        type: "required",     
                        message: `The value ${target.id} must be greater than 0`
                        }
                    };
                    }
                    break;
                
                case `Y_${pointName1}`:
                    if( value >= 0){
                    if(value !== points[0].y){
                        onSetPoints([{x: points[0].x, y: value}, {x: points[1].x, y: points[1].y}], 1, 1)
                    }
                    } else {
                    setValue(`${modeName}_${target.id}`, points[0].y, {shouldValidate: true})
                    error = {
                        [target.id]: {
                        type: "required",     
                        message: `The value ${target.id} must be greater than 0`
                        }
                    };
                    }
                    break;
            
                case `X_${pointName2}`:
                    if(value >= 0){
                    if( value !== points[1].x ){
                        onSetPoints([{x: points[0].x, y: points[0].y}, {x: value, y: points[1].y}], 1, 1)
                    }
                    }else {
                    setValue(`${modeName}_${target.id}`, points[1].x, {shouldValidate: true})
                    error = {
                        [target.id]: {
                        type: "required",     
                        message: `The value ${target.id} must be greater than 0`
                        }
                    };
                    }
                    break;
            
                case `Y_${pointName2}`:
                    if(value >= 0){
                    if( value !== points[1].y){
                        onSetPoints([{x: points[0].x, y: points[0].y}, {x: points[1].x, y: value}], 1, 1)
                    }
                    }else {
                    setValue(`${modeName}_${target.id}`, points[1].y, {shouldValidate: true})
                    error = {
                        [target.id]: {
                        type: "required",     
                        message: `The value ${target.id} must be greater than 0`
                        }
                    };
                    }
                    break;
                
                default:
                    break;
                }
  
            if(Object.keys(error).length !== 0){
              onSetErrorMessage(error)
            }
        }
      }


    useEffect(() => {
        if(points.length !== 0){
            setValue(`${modeName}_X_${pointName1}`, points[0].x, {shouldValidate: true})
            setValue(`${modeName}_Y_${pointName1}`, points[0].y, {shouldValidate: true})
            setValue(`${modeName}_X_${pointName2}`, points[1].x, {shouldValidate: true})
            setValue(`${modeName}_Y_${pointName2}`, points[1].y, {shouldValidate: true})
        }
    }, [points])

  return (
    <>
        <h2 className="form-subtitle mt-2 mb-1" id="pixel-coordinates"> Pixel Coordinates </h2>

        <label className="read-only red" htmlFor={`X_${pointName1}`}> {`X_${pointName1}`} </label>
        <input  type="number"
                step="any"
                className="input-field"
                defaultValue={0}
                id={`X_${pointName1}`}
                {...register(`${modeName}_X_${pointName1}`)} 
                onKeyDown={(event) => handleInputField(event, `Y_${pointName1}`)}
                onBlur={(event) => handleInputField(event, `Y_${pointName1}`)}
        />

        <label className='read-only red' htmlFor={`Y_${pointName1}`}> {`Y ${pointName1}`}</label>
        <input  type='number' 
                step="any" className='input-field' 
                {...register(`${modeName}_Y_${pointName1}`)} 
                defaultValue={0} id={`Y_${pointName1}`} 
                onKeyDown={(event) => handleInputField(event, `X_${pointName2}`)}
                onBlur={(event) => handleInputField(event, `X_${pointName2}`)}

        />

        <label className='read-only green' htmlFor={`X_${pointName2}`}> {`X ${pointName2}`}</label> 
        <input type='number' 
                step="any" className='input-field' 
                {...register(`${modeName}_X_${pointName2}`)} 
                defaultValue={0} id={`X_${pointName2}`} 
                onKeyDown={(event) => handleInputField(event, `Y_${pointName2}`)}
                onBlur={(event) => handleInputField(event, `Y_${pointName2}`)}

        />

        <label className='read-only green' htmlFor={`Y_${pointName2}`}> {`Y ${pointName2}`}</label>
        <input  type='number' 
                    step="any" className='input-field' 
                    {...register(`${modeName}_Y_${pointName2}`)} 
                    defaultValue={0} id={`Y_${pointName2}`} 
                    onKeyDown={(event) => handleInputField(event, 'wizard-next')}
                    onBlur={(event) => handleInputField(event, 'wizard-next')}   
        />
    </>
  )
}
