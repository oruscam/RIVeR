import { Line, Text } from 'react-konva';
import { useWizard } from 'react-use-wizard';
import { STEP_4, STEP_5,STEP_8 } from '../constants/constants';
import { useEffect, useState } from 'react';

interface LineAndTextProps {
    imagePoints: { x: number; y: number }[];
    name: string; 
    isPixelSize: boolean;
    resizeFactor?: number;
}

export const LineAndText = ({imagePoints, name, isPixelSize, resizeFactor = 1}: LineAndTextProps) => {
  const { activeStep } = useWizard();
  const [sortedPoints, setSortedPoints] = useState<{ x: number; y: number }[]>(imagePoints)

  let lineColor : string = ''
  let textColor : string = ''

  switch (activeStep) {
    case STEP_4:
      lineColor = "#6CD4FF"
      textColor = "#FFFFFF"
      break;
    case STEP_5:
      lineColor = "#F5BF61"
      textColor = "#F5BF61"
      break;

    case STEP_8:
      lineColor = "#F5BF61"
      textColor = "#F5BF61"
      break;

    // case STEP_8:
    //   lineColor = "#F5BF61"
    //   break;
    default:
      lineColor = "#545454"
      textColor = "#000000"
  }

  useEffect(() => {
    if(imagePoints.length === 2){
      const sorted =  [...imagePoints].sort((a, b) => a.x - b.x);
      setSortedPoints(sorted)
    }

  }, [imagePoints])

  return (
    <>
        <Line
            points={[imagePoints[0].x, imagePoints[0].y, imagePoints[1].x, imagePoints[1].y]}
            stroke={lineColor}
            strokeWidth={4 / resizeFactor}
            lineCap="round"
        />
        {
          !isPixelSize && (
            <Text
                x={(sortedPoints[1].x + 10 / resizeFactor)}
                y={(sortedPoints[1].y - 10 / resizeFactor)}
                text={name}
                fontSize={18 / resizeFactor}
                fill={textColor}
            /> 
          )
        }
    </>
  )
}
