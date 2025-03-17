import { VideoPlayer } from '../components/VideoPlayer/VideoPlayer'
import { FormVideo } from '../components/Forms/FormVideo'
import { WizardButtons } from '../components/WizzardButtons'
import { Error } from '../components/Error'
import { Progress } from '../components'
import { useProjectSlice } from '../hooks'

export const VideoRange = () => {
  const { video } = useProjectSlice();
  const { path }= video.data
  const { duration } = video.data
  
  return (
    <div className='regular-page'>
        <div className='media-container'>
          { path && <VideoPlayer fileURL={ path } duration={duration}/> }
          <Error/>
        </div>
        <div className='form-container'>
          <Progress/>
          <FormVideo duration={duration}/>
          {/* <FormVideoExtra/> */}
          
          <WizardButtons formId='form-video' canFollow={true}/>
        </div>
    </div>
  )
}
