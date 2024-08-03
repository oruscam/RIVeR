import React, { useEffect, useRef } from "react";
import { useDataSlice  } from "../hooks"
import { Image, Layer, Rect, Stage } from "react-konva";
import useImage from "use-image";
import Konva from "konva";
import { Quiver } from "./Quiver";

export const ImageWithData = ({ width, height, factor }: {width: number, height: number, factor: {x: number, y: number}}) => {
  const { video, processing } = useDataSlice();
  const {firstFramePath} = video;
  const [path, setPath] = React.useState('/@fs' + firstFramePath)
  const [image, _status] = useImage(path)
  const [mask, _maskStatus] = useImage(processing.maskPath? '/@fs' + processing.maskPath : '')
  const imageRef = useRef<Konva.Image>(null)
  const {par, step1, test} = processing

  useEffect(() => {
    if( processing.par[0] !== ''){
      setPath('/@fs'+ par[0])
    }
  }, [par])


  return (
    <div className="image-with-data-container" >
      
      <Stage width={width} height={height}>
        <Layer>
          {/* Default */}
          <Image image={image} width={width} height={height} ref={imageRef}/>
          {/* Mascara */}
          <Image image={mask} width={width} height={height}></Image>        
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
      { test && <Quiver width={width} height={height} factor={factor} />}
    </div>

  )
}
