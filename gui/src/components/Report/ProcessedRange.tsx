import { formatTime } from "../../helpers";
import { useDataSlice, useProjectSlice } from "../../hooks";

export const ProcessedRange = () => {
  const { video } = useProjectSlice();
  const { images } = useDataSlice();
  const { step, startTime, endTime } = video.parameters;
  const { fps, duration  } = video.data; 


  const timeProcessed = endTime - startTime;
  const timeBetweenFrames = (((1 / (fps || 0)) * step) * 1000).toFixed(2)
  
  const frameTime = (timeProcessed / 4)

  return (
    <>
        <h2 className="report-title-field mt-2">Processed Range</h2>
        <div id="report-processed-range-container">
          <div className="report-grid-1">
            <div className='report-info-item'><span>Start</span></div>
            <div className='report-info-item'><span>End</span></div> 
            <div className='report-info-item'><span>Length</span></div> 
            <div className='report-info-item'><span>Step</span></div> 
            <div className='report-info-item'><span>Time Step</span></div> 
            <div className='report-info-item'><span> { startTime?.toFixed(2) }s </span></div> 
            <div className='report-info-item'><span> { endTime?.toFixed(2) }s </span></div> 
            <div className='report-info-item'><span> { timeProcessed }s </span></div> 
            <div className='report-info-item'><span> { step } </span></div> 
            <div className='report-info-item'><span> { timeBetweenFrames }ms </span></div> 
          </div>

          <div id="report-carousel">
            <img src={'/@fs' + images.paths[0]} alt="First frame" className="report-carousel-img" id="first-img-carousel"/>
            <img src={'/@fs' + images.paths[0]} alt="First frame" className="report-carousel-img"/>
            <img src={'/@fs' + images.paths[0]} alt="First frame" className="report-carousel-img"/>
            <img src={'/@fs' + images.paths[0]} alt="First frame" className="report-carousel-img"/>
            <img src={'/@fs' + images.paths[0]} alt="First frame" className="report-carousel-img" id="last-img-carousel"/>
          </div>
          <div id="report-carousel-footer">
            <p className="report-carousel-footer-item"> { formatTime(startTime) } </p>
            <p className="report-carousel-footer-item">{ formatTime(frameTime) } </p>
            <p className="report-carousel-footer-item"> { formatTime(frameTime * 2)}</p>
            <p className="report-carousel-footer-item"> { formatTime(frameTime * 3)}</p>
            <p className="report-carousel-footer-item"> { formatTime(endTime)} </p>

          </div>
        </div>
    </>
)
}


