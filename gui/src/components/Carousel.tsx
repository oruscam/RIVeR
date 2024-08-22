import {  useDataSlice } from '../hooks'
import React, {  useRef, useState } from 'react'
import 'slick-carousel/slick/slick.css'
import 'slick-carousel/slick/slick-theme.css'
import Slider from 'react-slick'
import { carouselSettings } from './carouselSettings'
import { useWizard } from 'react-use-wizard'
import { STEP_7 } from '../constants/constants'

export const Carousel = ({showMedian, setShowMedian} : {showMedian?: boolean, setShowMedian?: any}) => {
    const sliderRef = useRef<Slider | null>(null);
    const { images, onSetActiveImage} = useDataSlice();
    const { paths, active } = images;
    
    const [defaultValue, setDefautValue] = React.useState<string | number>( active as string | number);
    const [_slideIndex, setSlideIndex] = useState<number>(Number(defaultValue));
    const [updateCount, setUpdateCount] = useState<number>(0);
    

    const { activeStep } = useWizard();



    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setDefautValue(event.currentTarget.value);
    }

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if(event.key === 'Enter'){
            const value = parseInt(event.currentTarget.value)
            if( value > 0 && value <= paths.length - 1){
                onSetActiveImage(value - 1)
                setDefautValue(value)
                sliderRef.current?.slickGoTo(value - 1)
            } else{
                console.log("hola")
                setDefautValue(active)
                console.log(defaultValue)
            }
        }
    }

    const handleOnClickImage = (_event: React.MouseEvent<HTMLDivElement>,index: number) => {
        if( index !== paths.length -1 ) {
            onSetActiveImage(index)
            setDefautValue(index +1)
            if(setShowMedian){
                setShowMedian(false)
            }
        }
    }


    return (
        <div className='carousel-container'>
            <div className='carousel-info'>                
                <input value={defaultValue} onChange={handleInputChange} onKeyDown={handleKeyDown}></input>
                <p> / { paths.length - 1 } </p>
            </div>
            <Slider ref={sliderRef} {...carouselSettings(updateCount, setSlideIndex, setUpdateCount)} >
                
                { activeStep === STEP_7 ? (
                    <div className='img-carousel-container' onClick={() => setShowMedian(!showMedian)}>
                        <img src={paths[0]} className={`img-carousel ${showMedian ? 'img-carousel-active': ''}`}></img>
                        <div className='img-water-mark' id='water-mark-median'> Median </div>
                    </div>
                ): null}

                {paths.map((src, index) => {
                    let className = 'img-carousel'
                    if( index === active ){
                        className = 'img-carousel-active img-carousel'
                    } else  if ( index === active +1 ) {
                        className = 'img-carousel-second img-carousel'
                    }
                    return ( 
                        <div key={index} className='img-carousel-container' onClick={(event) => handleOnClickImage(event, index)}>
                            <img src={src} alt={`Slide ${index}`} className={className}></img>
                            <div className='img-water-mark'> {index + 1} </div>
                        </div>
                    )
                })}
            </Slider>
        </div>
    )
}
