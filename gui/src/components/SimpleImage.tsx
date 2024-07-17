import React, { useEffect, useRef } from "react";
import { useDataSlice  } from "../hooks"
import { Image, Layer, Rect, Stage } from "react-konva";
import useImage from "use-image";
import { DrawSections } from "./DrawSections";
import Konva from "konva";

export const SimpleImage = ({ width, height, factor }: {width: number, height: number, factor: {x: number, y: number}}) => {
  const { video, processing } = useDataSlice();
  const {firstFramePath} = video;
  const [path, setPath] = React.useState('/@fs' + firstFramePath)
  const [image, status] = useImage(path)
  const imageRef = useRef<Konva.Image>(null)
  const {par, step1} = processing

  useEffect(() => {
    if( processing.par[0] !== ''){
      setPath('/@fs' + par[0])
    }
  }, [par])

  return (
    <Stage className="simple-image-container" width={width} height={height}>
      <Layer>
        <Image image={image} width={width} height={height} ref={imageRef}/>

        <Rect
          x={width / 2 - step1/2}
          y={height / 2 - step1/2}
          width={step1}
          height={step1}
          stroke={'#6CD4FF'}
          strokeWidth={2}
          dash={[5, 3]}
        />
        <Rect
          width={step1/2}
          height={step1/2}
          x={width / 2 - step1/4}
          y={height / 2 - step1/4}
          stroke={'#F5BF61'}
          strokeWidth={2}
          dash={[5, 3]}
        />

        <DrawSections  factor={factor}/>
      </Layer>
    </Stage>
  )
}
