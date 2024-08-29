import { useUiSlice } from './hooks/useUiSlice'
import { Wizard } from 'react-use-wizard'
import { HomePage, Step2, Step3, Step4, Step5, Step6, Step7, Step8 } from './pages/index'
import './App.css'
import { useEffect } from 'react'
import { Loading } from './components'
import { Report } from './pages/Report'

export const App: React.FC = () => {
  const { darkMode, isLoading, onSetScreen } = useUiSlice()
  
  
  useEffect(() => {
    window.addEventListener('resize', () => {
      const width = window.innerWidth
      const height = window.innerHeight
      onSetScreen({ width, height })
    })
  }, [])


  return (
    <div className='App' data-theme={darkMode ? "dark" : "light"}>
      <Wizard>
        {/* {isLoading ? <Loading/> :<HomePage/> }
        <Step2></Step2> 
        {isLoading ? <Loading/> : <Step3/>}
        {isLoading ? <Loading/> : <Step4/>}
        {isLoading ? <Loading/> : <Step5/>}
        {isLoading ? <Loading/> : <Step6/>}
        {isLoading ? <Loading/> : <Step7/>}
        {isLoading ? <Loading/> : <Step8/>} */}
      </Wizard>
      <Report/>
    </div>
  )
}