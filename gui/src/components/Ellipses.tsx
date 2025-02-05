import { Group, Ellipse as KonvaEllipse } from "react-konva";
import { useMatrixSlice } from "../hooks";
import { COLORS } from "../constants/constants";

export const Ellipses = ({ factor }) => {
    const { ipcam } = useMatrixSlice()
    const { cameraSolution, importedPoints } = ipcam

    if ( cameraSolution === undefined || importedPoints === undefined ) return null

    return (
        <Group>
            {
                cameraSolution.uncertaintyEllipses.map((ellipse, index) => {
                    if (importedPoints[index].selected === false ) return null

                    const [x, y] = ellipse.center
                    const width = ellipse.width / (factor * 1.8)
                    const height = ellipse.height / (factor * 1.8)
                    const angle = ellipse.angle
                    return (
                        <KonvaEllipse
                            key={index}
                            x={x / factor}
                            y={y / factor}
                            radiusX={width}
                            radiusY={height}
                            fill='#D2AF7970'
                            stroke='#D2AF79'
                            rotation={angle}
                        />
                )
                })
            }
        </Group>
    );
}