import { useEffect, useState } from "react"
// * PROVISIONAL 
export const InfoPixelSize = ({ animation }: { animation: string }) => {
    const [showInfo, setShowInfo] = useState(false)
    const [animationPath, setAnimationPath] = useState('')
    let timer: NodeJS.Timeout; 

    const handleMouseEnter = () => {
        timer = setTimeout(() => {
            setShowInfo(true)
        }, 2000)
    }

    const handleMouseLeave = () => {
        if( !showInfo){
            clearTimeout(timer)
        }
    }

    if( showInfo ){
        setTimeout(() => {
            setShowInfo(false)
        }, 3000)
    }
    
    useEffect(() => {

        if (animation === 'click-drag-drop') {
            import('../assets/animations/click_drag_drop_EN.gif').then((module) => {
                setAnimationPath(module.default)
            }).catch((error) => {
                console.log("No se encontro la imagen")
                console.log(error)
            })
        }
        return () => {
            clearTimeout(timer);
        };
    }, [])


    return (
        <div className="info-container">
            <p
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className="info-icon"
                onClick={() => setShowInfo(true)}
            > ? </p>
            {
                showInfo && (
                    <div className="info-animation">
                        <img src={animationPath} alt="Info Animation" className="info-gif"></img>
                    </div>
                )
            }
        </div>
    )
}
