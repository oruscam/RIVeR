import { Line, Text } from 'react-konva';
import { useWizard } from 'react-use-wizard';
import { BLACK, DARK_GREY, LIGHT_BLUE, STEP_4, STEP_5, STEP_8, WHITE, YELLOW } from '../constants/constants';
import { useSectionSlice } from '../hooks';

interface LineAndTextProps {
    localPoints?: { x: number; y: number }[];
    isPixelSize: boolean;
    resizeFactor?: number;
    factor: number
    index: number
}

export const LineAndText = ({localPoints, isPixelSize, resizeFactor = 1, factor, index}: LineAndTextProps) => {
  const { activeStep } = useWizard();

  const { sections } = useSectionSlice();
  const { sectionPoints, dirPoints, name } = sections[index]

  
  let lineColor : string = ''
  let textColor : string = ''

  switch (activeStep) {
    case STEP_4:
      lineColor = LIGHT_BLUE
      textColor = WHITE
      break;
    case STEP_5:
      lineColor = YELLOW
      textColor = YELLOW
      break;

    case STEP_8:
      lineColor = YELLOW
      textColor = YELLOW
      break;

    default:
      lineColor = DARK_GREY
      textColor = BLACK
  }

  
  const sectionLine = () => {
    if(!dirPoints.length) return null

    return (
      <Line
        points={sectionPoints.flatMap(point => [point.x / factor, point.y / factor])}
        stroke={DARK_GREY}
        strokeWidth={4 / resizeFactor}
        lineCap="round"
        dash={[5, 10]}
      />
    )
  }

  return (
    <>
      {
        sectionLine()
      }
      <Line
        points={localPoints ? localPoints.flatMap(point => [point.x, point.y]) : dirPoints.flatMap(point => [point.x / factor, point.y / factor])}
        stroke={lineColor}
        strokeWidth={4 / resizeFactor}
        lineCap="round"
      />
      {
        !isPixelSize && (
        <Text
          x={(sectionPoints[1].x / factor + 10 / resizeFactor)}
          y={(sectionPoints[1].y / factor - 10 / resizeFactor)}
          text={name}
          fontSize={18 / resizeFactor}
          fill={textColor}
          offset={{ x: 0, y: -15 }}
        /> 
        )
      }
    </>
  )
}
