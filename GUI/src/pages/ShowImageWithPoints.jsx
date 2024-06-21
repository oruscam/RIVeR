import React, { useState } from 'react'
import { WizardButtons } from '../components/WizzardButtons'
import './pages.css'
import { Circle, Image, Layer, Stage } from 'react-konva'
import useImage from 'use-image'
import { useDataSlice } from '../hooks/useDataSlice'
import { useWizard } from 'react-use-wizard'

export const ShowImageWithPoints = () => {
    const {points, image} = useDataSlice()
    const [imagen] = useImage(image)
    const { nextStep } = useWizard()
    console.log(points)
    console.log(imagen)
    return (
      <div className='stage-step5'>
        <Stage width={4000} height={2250} className='step5-overflow'>
          <Layer>
            <Image image={imagen}></Image>
            {points.map((point, index) => (
              <Circle
                key={index}
                x={point.x}
                y={point.y}
                radius={8}
                fill='red'
              ></Circle>
            ))}
          </Layer>
        </Stage>
        <WizardButtons onClick={nextStep}></WizardButtons>
      </div>
    )
  }