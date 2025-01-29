import { useDataSlice, useUiSlice } from '../hooks';
import React, { useRef, useState, useEffect } from 'react';
import { useWizard } from 'react-use-wizard';
import { MODULE_NUMBER } from '../constants/constants';
import { FixedSizeList as List } from 'react-window';
import { carouselClickImage, carouselKeyDown } from '../helpers';
import { useTranslation } from 'react-i18next';
import { carouselMediaClick, carouselMouseDown, carouselMouseUp } from '../helpers/carouselFunctions';
import { back, play as next } from '../assets/icons/icons';
import { Icon } from './Icon';

interface CarouselProps {
    images: string[];
    active: number;
    setActiveImage: (index: number) => void;
    showMedian?: boolean;
    setShowMedian?: (value: boolean) => void;
    mode: 'processing' | 'analize' | 'ipcam'
}

interface RowProps {
    index: number;
    style: React.CSSProperties;
}

export const Carousel: React.FC<CarouselProps> = ({ images, active, setActiveImage, showMedian, setShowMedian, mode }) => {
    const { t } = useTranslation();
    const { isBackendWorking, quiver } = useDataSlice();
    const [width, setWidth] = useState<number>(500);
    const { screenSizes } = useUiSlice();

    const [ itemWidth, setItemWidth ] = useState<number>(275);

    const [defaultValue, setDefaultValue] = useState<string | number>(active + 1 as string | number);
    const [scrollInterval, setScrollInterval] = useState<NodeJS.Timeout | null>(null);
    const [speedUpTimeout, setSpeedUpTimeout] = useState<NodeJS.Timeout | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<List>(null);

    const { activeStep } = useWizard();

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setDefaultValue(event.currentTarget.value);
    };

    const Row: React.FC<RowProps> = ({ index, style }) => {
        let className = 'img-carousel';
        if (index === active && !showMedian) {
            className = 'img-carousel-active img-carousel';
        } else if (index === active + 1 && !showMedian && mode !== 'ipcam') {
            className = 'img-carousel-second img-carousel';
        }

        return (
            <div key={index} className='img-carousel-container' 
                onClick={() => carouselClickImage( active, index, images, isBackendWorking, listRef.current!, setShowMedian, setActiveImage, setDefaultValue, mode)} 
                style={style}>
                <img src={images[index]} alt={`Slide ${index}`} className={className}></img>
                <div className='img-water-mark'> {index + 1} </div>
            </div>
        );
    };

    // useEffect(() => {
    //     const updateWidth = () => {
    //         if (containerRef.current) {
    //             setWidth(containerRef.current.offsetWidth);
    //         }
    //     };
    //     updateWidth(); // Set initial width
    //     window.addEventListener('resize', updateWidth); // Update width on window resize

    //     return () => {
    //         window.removeEventListener('resize', updateWidth); // Cleanup event listener
    //     };
    // }, []);

    // /**
    //  * Change the width of the carousel items depending on the screen height
    //  */

    // useEffect(() => {
    //     if (screenSizes.height < 800) {
    //         setItemWidth(240);
    //     } else {
    //         setItemWidth(275);
    //     }

    // }, [screenSizes.height])

    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                setWidth(containerRef.current.offsetWidth);
            }
            if (screenSizes.height < 800) {
                setItemWidth(240);
            } else {
                setItemWidth(275);
            }
        };
    
        updateDimensions(); // Set initial dimensions
        window.addEventListener('resize', updateDimensions); // Update dimensions on window resize
    
        return () => {
            window.removeEventListener('resize', updateDimensions); // Cleanup event listener
        };
    }, [screenSizes.height]);


    if ( mode === 'ipcam'){
        useEffect(() => {
            if (listRef.current) {
                listRef.current.scrollToItem(active, 'center');
            }
        }, [active])
    }


    return (
        <div ref={containerRef} className={`carousel-container mt-1 ${activeStep === MODULE_NUMBER.ANALIZING && !quiver || isBackendWorking ? 'disabled' : ''}`}>
            <div className='carousel-info'>
                {
                    activeStep === MODULE_NUMBER.ANALIZING && 
                    <button className={`wizard-button ${showMedian ? "wizard-button-active" : ""}`} onClick={() => carouselMediaClick(setShowMedian)}> {t('Processing.carouselMedia')} </button>
                }
                <div>
                    <input value={defaultValue}
                    onChange={handleInputChange} 
                    onKeyDown={ ( event ) => carouselKeyDown(event, images, setActiveImage, setDefaultValue, active, listRef.current!, mode)} 
                    disabled={isBackendWorking}></input>
                    <p> / {images.length} </p>
                </div>
            </div>
            <div className='carousel'>
                <button id='carousel-backward' className='video-button'
                    onMouseDown={() => carouselMouseDown('backward', listRef, setScrollInterval, setSpeedUpTimeout)}
                    onMouseUp={() => carouselMouseUp(scrollInterval, speedUpTimeout, setScrollInterval, setSpeedUpTimeout)}
                    onMouseLeave={() => carouselMouseUp(scrollInterval, speedUpTimeout, setScrollInterval, setSpeedUpTimeout)}
                    > <Icon path={back}/> </button>
                <List
                    height={itemWidth - 85} // Altura del contenedor del carrusel
                    itemCount={images.length} // Número total de elementos
                    itemSize={itemWidth} // Ancho de cada elemento
                    layout="horizontal" // Disposición horizontal
                    width={width} // Ancho del contenedor del carrusel
                    className='carousel-list' // Clase del contenedor del carrusel
                    ref={listRef}
                >
                {Row}
                </List>
                <button id='carousel-forward' className='video-button'
                    onMouseDown={() => carouselMouseDown('forward', listRef, setScrollInterval, setSpeedUpTimeout)}
                    onMouseUp={() => carouselMouseUp(scrollInterval, speedUpTimeout, setScrollInterval, setSpeedUpTimeout)}
                    onMouseLeave={() => carouselMouseUp(scrollInterval, speedUpTimeout, setScrollInterval, setSpeedUpTimeout)}
                    > <Icon path={next}/></button>
            </div>
        </div>
    );
};