import { useFormContext } from 'react-hook-form'
import { useDataSlice } from '../../hooks';
import { useEffect, useState } from 'react';

// TODO ENVIAR A HELPER
function getPointNames(modeName) {
    if (modeName === 'pixel_size') {
      return { pointName1: 'point-1', pointName2: 'point-2'};
    } else {
      return { pointName1: 'Left', pointName2: 'Right' };
    }
  }

interface Point {
  x: number, y: number
}

export const HardMode = ({modeName, factor}: {modeName: string, factor: {x:number, y:number}}) => {
    const { register, watch, setValue } = useFormContext();
    const { pointName1, pointName2 } = getPointNames(modeName);
    const { sections, activeSection, onSetPoints} = useDataSlice();
    const { points } = sections[activeSection];
    const [localPoints, setLocalPoints] = useState<Point[]>()


    // const x1 = watch(`${modeName}-X_${pointName1}`);
    // const x2=  watch(`${modeName}-X_${pointName2}`);
    // const y1 = watch(`${modeName}-Y_${pointName1}`);
    // const y2 = watch(`${modeName}-Y_${pointName2}`);


    useEffect(() => {
      if(points.length !== 0){
        const reducedPoints = points.map(point => {
          return {
            x: point.x / factor.x,
            y: point.y / factor.y
          }
        })
        setLocalPoints(reducedPoints);
        setValue(`${modeName}-X_${pointName1}`, reducedPoints[1].x.toFixed(2), {shouldValidate: true})
        setValue(`${modeName}-Y_${pointName1}`, reducedPoints[1].y.toFixed(2), {shouldValidate: true})
        setValue(`${modeName}-X_${pointName2}`, reducedPoints[0].x.toFixed(2), {shouldValidate: true})
        setValue(`${modeName}-Y_${pointName2}`, reducedPoints[0].y.toFixed(2), {shouldValidate: true})
      }
    }, [points])

    // USE EFFECT PARA EL MANEJO DE CAMBIOS EN LOS INPUTS de pixel coordinates
    // useEffect(() => {
    //   if( x1 && x2 && y1 && y2 && localPoints?.length === 2){
    //     if ( x1 !== localPoints[1].x || y1 !== localPoints[1].y || x2 !== localPoints[0].x || y2 !== localPoints[0].y){ 
    //       console.log("hay cambios")
    //     }
    // }
    // },[x1, x2, y1, y2])

    return (
        <div className='hard-mode' id={`${modeName}-HardMode`}>
            <h2 className='form-subtitle mt-5 mb-1' id='REAL_WORLD'> Real World Coordinates </h2>

            <label className='read-only red' htmlFor={`EAST_${pointName1}`}> {`East ${pointName1}`}</label>
            <input type='number' step="any" className='input-field' {...register(`${modeName}-EAST_${pointName1}`)} defaultValue={0} id={`EAST_${pointName1}`}/>
            <label className='read-only red' htmlFor={`NORTH_${pointName1}`}> {`North ${pointName1}`}</label>
            <input type='number' step="any" className='input-field' {...register(`${modeName}-NORTH_${pointName1}`)} defaultValue={0} id={`NORTH_${pointName1}`}/>

            <label className='read-only green' htmlFor={`EAST_${pointName2}`}> {`East ${pointName2}`}</label>
            <input type='number' step="any" className='input-field' {...register(`${modeName}-EAST_${pointName2}`)} defaultValue={0} id={`EAST_${pointName2}`}/>
            <label className='read-only green' htmlFor={`NORTH_${pointName2}`}> {`North ${pointName2}`}</label>
            <input type='number' step="any" className='input-field' {...register(`${modeName}-NORTH_${pointName2}`)} defaultValue={0} id={`NORTH_${pointName2}`}/>
            
            <h2 className='form-subtitle mt-2 mb-1'> Pixel Coordinates </h2>

            <label className='read-only red' htmlFor={`X_${pointName1}`}> {`X ${pointName1}`}</label>
            <input type='number' step="any" className='input-field' {...register(`${modeName}-X_${pointName1}`)} defaultValue={0} id={`X_${pointName1}`}/>
            <label className='read-only red' htmlFor={`Y_${pointName1}`}> {`Y ${pointName1}`}</label>
            <input type='number' step="any" className='input-field' {...register(`${modeName}-Y_${pointName1}`)} defaultValue={0} id={`Y_${pointName1}`}/>

            <label className='read-only green' htmlFor={`X_${pointName2}`}> {`X ${pointName2}`}</label> 
            <input type='number' step="any" className='input-field' {...register(`${modeName}-X_${pointName2}`)} defaultValue={0} id={`X_${pointName2}`}/>
            <label className='read-only green' htmlFor={`Y_${pointName2}`}> {`Y ${pointName2}`}</label>
            <input type='number' step="any" className='input-field' {...register(`${modeName}-Y_${pointName2}`)} defaultValue={0} id={`Y_${pointName2}`}/>
        </div>
  )
}
