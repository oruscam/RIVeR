import { Line, Text } from 'react-konva';
import { useWizard } from 'react-use-wizard';
import { useSectionSlice, useUiSlice } from '../hooks';
import { COLORS, MODULE_NUMBER } from '../constants/constants';
import { getPositionSectionText } from '../helpers';

interface LineAndTextProps {
    localPoints?: { x: number; y: number }[];
    isPixelSize: boolean;
    resizeFactor?: number;
    factor: number
    index: number
}

export const LineAndText = ({localPoints, isPixelSize, resizeFactor = 1, factor, index }: LineAndTextProps) => {
  const { activeStep } = useWizard();

  const { sections } = useSectionSlice();
  const { sectionPoints, dirPoints, name } = sections[index]

  const { screenSizes } = useUiSlice()
  const { imageHeight, imageWidth } = screenSizes

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
    if ( activeStep === MODULE_NUMBER.PIXEL_SIZE ) return null

    return (
      <Line
        points={sectionPoints.flatMap(point => [point.x / factor, point.y / factor])}
        stroke={lineColor}
        strokeWidth={4 / resizeFactor}
        lineCap="round"
        dash={[5, 10]}
      />
    )
  }

  const getText = () => {    
    const { point, rotation } = getPositionSectionText(sectionPoints[0], sectionPoints[1], imageWidth ? imageWidth : 0, imageHeight ? imageHeight : 0, factor);

    return (
      <Text
        x={point.x / factor}
        y={point.y / factor}
        text={name}
        fontSize={18 / resizeFactor}
        fill={textColor}
        offset={{ x: 0, y: -15}}
        rotation={rotation}
      /> 
    );
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
        !isPixelSize && sectionPoints[0].x !== 0 && getText()
      }
    </>
  )
}
