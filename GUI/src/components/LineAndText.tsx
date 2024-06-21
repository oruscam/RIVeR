import { Line, Text } from 'react-konva';

interface LineAndTextProps {
    imagePoints: { x: number; y: number }[];
    name: string; 
    isPixelSize: boolean;
}

export const LineAndText = ({imagePoints, name, isPixelSize}: LineAndTextProps) => {
  return (
    <>
        <Line
            points={[imagePoints[0].x, imagePoints[0].y, imagePoints[1].x, imagePoints[1].y]}
            stroke={isPixelSize ? "#054A74" : "#F5BF61"}
            strokeWidth={2}
            lineCap="round"
        />
        {
          !isPixelSize && (
            <Text
                x={(imagePoints[1].x + 10)}
                y={(imagePoints[1].y - 10 )}
                text={name}
                fontSize={18}
                fill="#F5BF61"
            /> 
          ) 
        }
    </>
  )
}
