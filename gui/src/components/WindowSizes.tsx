import { Group, Rect } from 'react-konva'
import { useDataSlice, useProjectSlice, useUiSlice } from '../hooks';

export const WindowSizes = ({ width, height }: { width: number, height: number }) => {
  const { processing } = useDataSlice();
  const { step1 } = processing.form
  const { screenSizes } = useUiSlice()
  const { factor } = screenSizes
  const { video } = useProjectSlice()
  console.log(video)

  const size = step1 / factor!
  const xCenter = width / 2
  const yCenter = height / 2

  console.log(factor)

  return (
    <Group>
      <Rect
        x={xCenter - size / 2}
        y={yCenter - size / 2}
        width={size}
        height={size}
        stroke={'#6CD4FF'}
        strokeWidth={2.5}
        dash={[5, 3]}
      />
      <Rect
        x={xCenter - size / 4}
        y={yCenter - size / 4}
        width={size / 2}
        height={size / 2}
        stroke={'#F5BF61'}
        strokeWidth={2.5}
        dash={[5, 3]}
      />
    </Group>
  )
}
