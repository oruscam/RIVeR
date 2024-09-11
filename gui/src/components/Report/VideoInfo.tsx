import { formatTime, recortStringDate } from '../../helpers';
import { useProjectSlice } from '../../hooks'
import './report.css'

export const VideoInfo = () => {

  const { video } = useProjectSlice();
  const { name, duration, fps, width, height, creation } = video.data;

  return (
    <>
        <h2 className='report-title-field mt-3'> Video Information </h2>      
        <div id='report-video-info-container'>
          <div className='report-grid-1'>
            <div className='report-info-item'><span>Name</span></div>
            <div className='report-info-item'><span>Duration</span></div> 
            <div className='report-info-item'><span>Resolution</span></div> 
            <div className='report-info-item'><span>FPS</span></div> 
            <div className='report-info-item'><span>Creation Date</span></div> 
            <div className='report-info-item'><span> { name } </span></div> 
            <div className='report-info-item'><span> { formatTime(duration) }s </span></div> 
            <div className='report-info-item'><span> { `${width}x${height}`} </span></div> 
            <div className='report-info-item'><span> { fps } </span></div> 
            <div className='report-info-item'><span> { recortStringDate(creation) } </span></div> 
          </div>
          </div>  
    </>
  )
}
