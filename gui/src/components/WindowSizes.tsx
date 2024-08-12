import { Layer, Rect, Stage } from 'react-konva'
import { useDataSlice } from '../hooks';

export const WindowSizes = ({ width, height } : {width: number, height: number}) => {
    const { processing } = useDataSlice();
    const { step1 } = processing.form
    
  return (
    <Stage width={width} height={height} className="data-stage">
        <Layer>
        <Rect
            x={width / 2 - step1/2}
            y={height / 2 - step1/2}
            width={step1}
            height={step1}
            stroke={'#6CD4FF'}
            strokeWidth={2.5}
            dash={[5, 3]}
        />
        <Rect
            width={step1/2}
            height={step1/2}
            x={width / 2 - step1/4}
            y={height / 2 - step1/4}
            stroke={'#F5BF61'}
            strokeWidth={2.5}
            dash={[5, 3]}
        />
        </Layer>
  </Stage>
  )
}
