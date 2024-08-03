import { useDataSlice } from '../hooks'
import React, { useEffect, useRef, useState } from 'react'
import 'slick-carousel/slick/slick.css'
import 'slick-carousel/slick/slick-theme.css'
import Slider from 'react-slick'
import { carouselSettings } from './carouselSettings'



export const Carousel = () => {
    const { projectDirectory, onUpdateProccesing, processing } = useDataSlice()
    
    // DIRECTORIO DONDE BUSCAR LAS IMAGENES
    const folder = projectDirectory + '/frames'
    

    const [_imagePaths, setImagePaths] = React.useState([]);
    const [images, setImages] = React.useState([]);

    // ESTABLECE LA IMAGEN SELECCIONADA POR DEFECTO.
    const [defaultValue, setDefautValue] = React.useState<string | number>(processing.par[1] as string | number);

    // MANEJADORES DE ESTADOS DE SLIDER
    const [_slideIndex, setSlideIndex] = useState(defaultValue);
    const [updateCount, setUpdateCount] = useState(0);
    let sliderRef = useRef<Slider | null>(null);

    // Cambia la Imagen del principal cuando clickeamos en una imagen del carrousel, y actualiza el centerMode del carrousel.
    const handleOnClickImage = (_event: React.MouseEvent<HTMLDivElement>,index: number, src: string) => {
        onUpdateProccesing({images: [src, (index + 1).toString(), images[index + 1], (index + 2).toString()]})
        setDefautValue(index + 1)
    }

    // Maneja el input del numero de imagen que ingresamos por teclado. 
    // Si es un numero valido actualiza, y sino establece el valor existente.
    const handleInput = ( event: React.KeyboardEvent<HTMLInputElement> ) => {
        if(event.key === 'Enter'){
            const value = parseInt(event.currentTarget.value)
            if( value > 0 && value <= images.length){
                onUpdateProccesing({images: [images[value - 1], value.toString(), images[value], (value + 1).toString()]})
                setDefautValue(value)
                sliderRef.current?.slickGoTo(value - 1)
            } else{
                setDefautValue(processing.par[1])
            }
        }
    }

    // Actualiza el valor por default cada vez que cambia, de esta forma podemos ver como se actualiza en la pantalla.
    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setDefautValue(event.currentTarget.value); // Actualizar el estado local con el valor actual del input
    };
    

    // ! Trae las imagenes del directorio de frames y las carga en el carrousel. ** MEJORAR
    // ! _imagePaths es un array de strings con los nombres de las imagenes.
    // ! images es un array de strings con las rutas completas de las imagenes.
    // * QUIZAS AHÍ SE PUEDE HACER ALGO PARA NO CARGAR TODAS LAS IMAGENES DE UNA.
    useEffect(() => {
        const ipcRenderer = window.ipcRenderer
        ipcRenderer.invoke('get-images', { folder: folder }).then((result) => {
            setImagePaths(result)
            const loadedImages = result.map((imageName: string, _index: number) => {
                return `${folder}/${imageName}`; // Construye la ruta completa de la imagen
            });
            setImages(loadedImages);
        })

    }, [folder])


    return (
        <div className='carousel-container'>
            <div className='carousel-info'>
                <input className='carousel-input' value={defaultValue} onChange={handleInputChange} onKeyDown={handleInput}></input>
                <p> / {images.length}</p>
            </div>
            <Slider ref={sliderRef} {...carouselSettings(updateCount, setUpdateCount, setSlideIndex)}>
                {images.map((src, index) => {
                    let className = 'img-carousel'
                    if( src === processing.par[0]){
                        className = 'img-carousel-active img-carousel'
                    } else if( src === processing.par[2] || processing.par[2] === '' && index === 1){
                        className = 'img-carousel-second img-carousel'
                    }
                    return (
                    <div key={index} onClick={( event) => handleOnClickImage( event, index, src)} className='img-container'>
                        <img src={'/@fs/' + src} alt={`Slide ${index}`} className={className} />
                        <div className='img-water-mark'> {index + 1} </div>
                    </div>
                )})}
            </Slider>
        </div>
    )
}
