import { Line, Text } from 'react-konva';
import { useWizard } from 'react-use-wizard';
import { STEP_4, STEP_5, STEP_6, STEP_7, STEP_8 } from '../constants/constants';

interface LineAndTextProps {
    imagePoints: { x: number; y: number }[];
    name: string; 
    isPixelSize: boolean;
}

export const LineAndText = ({imagePoints, name, isPixelSize}: LineAndTextProps) => {
  const { activeStep } = useWizard();
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

  return (
    <>
        <Line
            points={[imagePoints[0].x, imagePoints[0].y, imagePoints[1].x, imagePoints[1].y]}
            stroke={lineColor}
            strokeWidth={1.3}
            lineCap="round"
        />
        {
          !isPixelSize ? (
            <Text
                x={(imagePoints[0].x + 10)}
                y={(imagePoints[0].y - 10 )}
                text={name}
                fontSize={18}
                fill={textColor}
            /> 
          ) : imagePoints.map((point, index) => {
            return (
              <Text
                key={index}
                x={(point.x - 4)}
                y={(point.y - 35 )}
                text={index === 0 ? "1" : "2"}
                fontSize={15}
                fill={textColor}
                />
          )})

          }
    </>
  )
}
