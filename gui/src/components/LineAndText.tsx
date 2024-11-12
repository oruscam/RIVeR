import { Line, Text } from 'react-konva';
import { useWizard } from 'react-use-wizard';
import { useSectionSlice } from '../hooks';
import { COLORS, MODULE_NUMBER } from '../constants/constants';

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
    case MODULE_NUMBER.PIXEL_SIZE:
      lineColor = COLORS.LIGHT_BLUE
      textColor = COLORS.WHITE
      break;
    case MODULE_NUMBER.CROSS_SECTIONS:
      lineColor = COLORS.YELLOW
      textColor = COLORS.YELLOW
      break;

    case MODULE_NUMBER.RESULTS:
      lineColor = COLORS.YELLOW
      textColor = COLORS.YELLOW
      break;

    default:
      lineColor = COLORS.DARK_GREY
      textColor = COLORS.BLACK
  }

  
  const sectionLine = () => {
    if(!dirPoints.length) return null

    return (
      <Line
        points={sectionPoints.flatMap(point => [point.x / factor, point.y / factor])}
        stroke={COLORS.DARK_GREY}
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
