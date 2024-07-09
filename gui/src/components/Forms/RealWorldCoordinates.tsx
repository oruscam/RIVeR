import { useFormContext } from "react-hook-form";
import { getPointNames } from "../../helpers/index";
import { useDataSlice, useUiSlice } from "../../hooks";



export const RealWorldCoordinates = ({ modeName } : {modeName : string}) => {
    const { pointName1, pointName2 } = getPointNames(modeName);
    const { register, resetField} = useFormContext()  
    const { onSetErrorMessage } = useUiSlice()
    const { onSetRealWorld } = useDataSlice()


    const handleInputField = ( event: React.KeyboardEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement> , nextFieldId: string ) => {
        if((event as React.KeyboardEvent<HTMLInputElement>).key  === 'Enter' || event.type === 'blur'){
          event.preventDefault()
          if( event.type !== 'blur'){
            document.getElementById(nextFieldId)?.focus()
            }
          const value = parseFloat((event.target as HTMLInputElement).value);
          const target = event.target as HTMLInputElement;

          // if( value < 0){
          //   const error = {
          //       [target.id]: {
          //       type: "required",     
          //       message: `The value ${target.id} must be greater than 0`
          //           }
          //       };

          //   onSetErrorMessage(error)
          //   const fieldName = `${modeName}_${target.id}`
          //   resetField(fieldName)
          //   return
          // }

          switch (target.id) {
            case `EAST_${pointName1}`:
                onSetRealWorld(value, "x1")
                break;
            
            case `NORTH_${pointName1}`:
                onSetRealWorld(value, "y1")
                break;
      
            case `EAST_${pointName2}`:
                onSetRealWorld(value, "x2")

                break;
      
            case `NORTH_${pointName2}`:
                onSetRealWorld(value, "y2")
              break;
            
            default:
              break;
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
                id={`EAST_${pointName1}`} 
                onKeyDown={(event) => handleInputField(event, `NORTH_${pointName1}`)}
                onBlur={(event) => handleInputField(event, `NORTH_${pointName1}`)}
        />
        
        <label className='read-only red' htmlFor={`NORTH_${pointName1}`}> {`North ${pointName1}`}</label>
        <input  type='number' 
                step="any" 
                className='input-field' 
                {...register(`${modeName}_NORTH_${pointName1}`)} 
                id={`NORTH_${pointName1}`}
                onKeyDown={( event ) => handleInputField(event,`EAST_${pointName2}` )}
                onBlur={(event) => handleInputField(event, `EAST_${pointName2}`)}
        />

        <label className='read-only green' htmlFor={`EAST_${pointName2}`}> {`East ${pointName2}`}</label>
        <input  type='number' 
                step="any" 
                className='input-field' 
                {...register(`${modeName}_EAST_${pointName2}`)} 
                id={`EAST_${pointName2}`} 
                onKeyDown={( event ) => handleInputField(event,`NORTH_${pointName2}`)}
                onBlur={(event) => handleInputField(event, `NORTH_${pointName2}`)}
        />
        
        <label className='read-only green' htmlFor={`NORTH_${pointName2}`}> {`North ${pointName2}`}</label>
        <input  type='number' 
                step="any" 
                className='input-field' 
                {...register(`${modeName}_NORTH_${pointName2}`)} 
                id={`NORTH_${pointName2}`}
                onKeyDown={( event ) => handleInputField(event,'pixel-coordinates')}
                onBlur={(event) => handleInputField(event, 'pixel-coordinates')}
        />
    </>
  )
}
