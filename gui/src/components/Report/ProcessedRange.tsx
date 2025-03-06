import { useTranslation } from "react-i18next";
import { formatTime } from "../../helpers";
import { useDataSlice, useProjectSlice } from "../../hooks";

export const ProcessedRange = () => {
  const { t } = useTranslation(); 
  const { video } = useProjectSlice();
  const { images } = useDataSlice();
  const { paths } = images;
  const { step, startTime, endTime } = video.parameters;
  const { fps } = video.data; 


  const timeProcessed = endTime - startTime;
  const timeBetweenFrames = (((1 / (fps || 0)) * step) * 1000).toFixed(2)
  
  const frameTime = (timeProcessed / 4)

  const firstQuarter = Math.floor(paths.length / 4);
  const half = Math.floor(paths.length / 2);
  const lastQuarter = paths.length - firstQuarter;
  

  return (
    <>
        <h2 className="report-title-field mt-2">{t('Report.ProcessedRange.title')}</h2>
        <div id="report-processed-range-container">
          <div className="report-grid-1">
            <div className='report-info-item'><span>{t('Report.ProcessedRange.start')}</span></div>
            <div className='report-info-item'><span>{t('Report.ProcessedRange.end')}</span></div> 
            <div className='report-info-item'><span>{t('Report.ProcessedRange.length')}</span></div> 
            <div className='report-info-item'><span>{t('Report.ProcessedRange.step')}</span></div> 
            <div className='report-info-item'><span>{t('Report.ProcessedRange.timeStep')}</span></div> 
            <div className='report-info-item'><span> { startTime }s </span></div> 
            <div className='report-info-item'><span> { endTime }s </span></div> 
            <div className='report-info-item'><span> { timeProcessed }s </span></div> 
            <div className='report-info-item'><span> { step } </span></div> 
            <div className='report-info-item'><span> { timeBetweenFrames }ms </span></div> 
          </div>

          <div id="report-carousel">
            <img src={paths[0]} alt="First frame" className="report-carousel-img" id="first-img-carousel"/>
            <img src={paths[firstQuarter]} alt="First frame" className="report-carousel-img"/>
            <img src={paths[half]} alt="First frame" className="report-carousel-img"/>
            <img src={paths[lastQuarter]} alt="First frame" className="report-carousel-img"/>
            <img src={paths[paths.length -1]} alt="First frame" className="report-carousel-img" id="last-img-carousel"/>
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


