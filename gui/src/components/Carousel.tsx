import { useDataSlice } from '../hooks'
import React, { useEffect } from 'react'
import 'slick-carousel/slick/slick.css'
import 'slick-carousel/slick/slick-theme.css'
import Slider from 'react-slick'


export const Carousel = () => {
    const { projectDirectory, video } = useDataSlice()
    const folder = projectDirectory + '/frames'

    const [imagePaths, setImagePaths] = React.useState([]);
    const [images, setImages] = React.useState([]);

    const settings = {
        infinte: true,
        slidesToShow: 1,
        slidesToScroll: 1,
        centerPadding: "60px",
        speed: 500,
        
        
    }
        
    useEffect(() => {
        const ipcRenderer = window.ipcRenderer
        ipcRenderer.invoke('get-images', {folder: folder}).then((result) => {
            setImagePaths(result)
            const loadedImages = result.map((imageName, index) => {
                    return `/@fs/${folder}/${imageName}`; // Construye la ruta completa de la imagen
            });
            setImages(loadedImages);
        })



    },[folder])

    console.log(images)

  return (
    <div className='carousel-container'>
        <Slider {...settings}>
            {images.map((src, index) => (
                        <div key={index}>
                            <img src={src} alt={`Slide ${index}`} className={index == 10 ? "img-carousel hola" : " img-carousel"} />
                        </div>
            ))}

        </Slider>
    </div>
  )
  }
  
  {/* <img src={images[1]} width={500} height={400}></img> */}