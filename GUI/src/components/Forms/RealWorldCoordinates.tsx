import { useFormContext } from "react-hook-form";
import { getPointNames } from "../../helpers/index";
import { useDataSlice, useUiSlice } from "../../hooks";
import { useEffect } from "react";

interface RealWorldCoordinatesProps {
    modeName: string;
    rwCoordinates: { x: number, y: number }[];
    setRwCoordinates: (points: { x: number, y: number }[]) => void;
}

export const RealWorldCoordinates = ({ modeName, rwCoordinates, setRwCoordinates } : RealWorldCoordinatesProps) => {
    const { pointName1, pointName2 } = getPointNames(modeName);
    const { register, setValue } = useFormContext()  
    const { onSetErrorMessage } = useUiSlice()
    const { sections, activeSection } = useDataSlice()


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
            case `EAST_${pointName1}`:
                if( value >= 0){
                    if( value !== rwCoordinates[0].x){
                        setRwCoordinates([{x: value, y: rwCoordinates[0].y}, {x: rwCoordinates[1].x, y: rwCoordinates[1].y}])
                    }
                } else {
                    setValue(`${modeName}_${target.id}`, rwCoordinates[0].x, {shouldValidate: true})
                    error = {
                        [target.id]: {
                        type: "required",     
                        message: `The value ${target.id} must be greater than 0`
                        }
                    };
                }

                break;
            
            case `NORTH_${pointName1}`:
                if( value >= 0){
                    if( value !== rwCoordinates[0].y){
                      setRwCoordinates([{x: rwCoordinates[0].x, y: value}, {x: rwCoordinates[1].x, y: rwCoordinates[1].y}])
                    }
                } else {
                    setValue(`${modeName}_${target.id}`, rwCoordinates[0].y, {shouldValidate: true})
                    error = {
                        [target.id]: {
                        type: "required",     
                        message: `The value ${target.id} must be greater than 0`
                        }
                    };
                }

                break;
      
            case `EAST_${pointName2}`:
                if( value >= 0){
                    if( value !== rwCoordinates[1].x){
                      setRwCoordinates([{x: rwCoordinates[0].x, y: rwCoordinates[0].y}, {x: value, y: rwCoordinates[1].y}])
                    }
                } else {
                    setValue(`${modeName}_${target.id}`, rwCoordinates[1].x, {shouldValidate: true})
                    error = {
                        [target.id]: {
                        type: "required",     
                        message: `The value ${target.id} must be greater than 0`
                        }
                    };
                }

                break;
      
            case `NORTH_${pointName2}`:
                if( value >= 0){
                    if( value !== rwCoordinates[1].y){
                      setRwCoordinates([{x: rwCoordinates[0].x, y: rwCoordinates[0].y}, {x: rwCoordinates[1].x, y: value}])
                    }
                } else {
                    setValue(`${modeName}_${target.id}`, rwCoordinates[1].y, {shouldValidate: true})
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

          if(Object.keys(error).length > 0){
                onSetErrorMessage(error)
            }
        } 
      }

  return (
    <>
        <h2 className='form-subtitle mt-5 mb-1' id='REAL_WORLD'> Real World Coordinates </h2>

        <label className='read-only red' htmlFor={`EAST_${pointName1}`}> {`East ${pointName1}`}</label>
        <input  type='number' 
                step="any" 
                className='input-field' 
                {...register(`${modeName}_EAST_${pointName1}`)} 
                defaultValue={rwCoordinates[0].x} 
                id={`EAST_${pointName1}`} 
                onKeyDown={(event) => handleInputField(event, `NORTH_${pointName1}`)}
                onBlur={(event) => handleInputField(event, `NORTH_${pointName1}`)}
        />
        
        <label className='read-only red' htmlFor={`NORTH_${pointName1}`}> {`North ${pointName1}`}</label>
        <input  type='number' 
                step="any" 
                className='input-field' 
                {...register(`${modeName}_NORTH_${pointName1}`)} 
                defaultValue={rwCoordinates[0].y} 
                id={`NORTH_${pointName1}`}
                onKeyDown={( event ) => handleInputField(event,`EAST_${pointName2}` )}
                onBlur={(event) => handleInputField(event, `EAST_${pointName2}`)}
        />

        <label className='read-only green' htmlFor={`EAST_${pointName2}`}> {`East ${pointName2}`}</label>
        <input  type='number' 
                step="any" 
                className='input-field' 
                {...register(`${modeName}_EAST_${pointName2}`)} 
                defaultValue={rwCoordinates[1].x} 
                id={`EAST_${pointName2}`} 
                onKeyDown={( event ) => handleInputField(event,`NORTH_${pointName2}`)}
                onBlur={(event) => handleInputField(event, `NORTH_${pointName2}`)}
        />
        
        <label className='read-only green' htmlFor={`NORTH_${pointName2}`}> {`North ${pointName2}`}</label>
        <input  type='number' 
                step="any" 
                className='input-field' 
                {...register(`${modeName}_NORTH_${pointName2}`)} 
                defaultValue={rwCoordinates[1].y} 
                id={`NORTH_${pointName2}`}
                onKeyDown={( event ) => handleInputField(event,'pixel-coordinates')}
                onBlur={(event) => handleInputField(event, 'pixel-coordinates')}
        />
    </>
  )
}
