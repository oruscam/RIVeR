import { useUiSlice } from './hooks/useUiSlice'
import { Wizard } from 'react-use-wizard'
import { HomePage, FootageMode, VideoRange, PixelSize, CrossSections, Processing, Analize, Results, ControlPoints } from './pages/index'
import './App.css'
import { useEffect } from 'react'
import { Loading } from './components'
import { Report } from './pages/Report'
import { useProjectSlice, useSectionSlice } from './hooks'
import { FOOTAGE_TYPES } from './constants/constants'

export const App: React.FC = () => {
  const { darkMode, isLoading, onSetScreen } = useUiSlice()
  const { type, video } = useProjectSlice()
  const { data } = video 
  const { sections, activeSection } = useSectionSlice()

  console.log(sections[activeSection].name)
  console.log(sections[activeSection].hasChanged)
  console.log(sections[activeSection].pixelSize)

  const getStep4 = () => {
    switch (type) {
      case FOOTAGE_TYPES.UAV:
        return <PixelSize/>

      case FOOTAGE_TYPES.IPCAM:
        return <ControlPoints/>
      
      case FOOTAGE_TYPES.OBLIQUE:
        return <ControlPoints/>
      
      default:
        return <HomePage/>
    }

  }
  
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      onSetScreen({ windowWidth: width, windowHeight: height, imageWidth: data.width, imageHeight: data.height })
    }

    window.addEventListener('resize', handleResize)
    handleResize()

    return () => window.removeEventListener('resize', handleResize)
  }, [data])



  return (
    <div className='App' data-theme={darkMode ? "dark" : "light"}>
      <Wizard>
        {isLoading ? <Loading/> :<HomePage/> }
        {isLoading ? <Loading/> : <FootageMode></FootageMode>}
        {isLoading ? <Loading/> : <VideoRange/>}
        {isLoading ? <Loading/> : getStep4()}
        {isLoading ? <Loading/> : <CrossSections/>}
        {isLoading ? <Loading/> : <Processing/>}
        {isLoading ? <Loading/> : <Analize/>}
        {isLoading ? <Loading/> : <Results/>}
        {/* <LastSettings/> */}
        <Report/>
      </Wizard>
    </div>
  )
}


