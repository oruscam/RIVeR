import { useTranslation } from 'react-i18next'
import { useProjectSlice } from '../../hooks'


export const FormVideoExtra: React.FC<{ step: number }> = ({ step }) => {
    const { t } = useTranslation()
    const { video } = useProjectSlice()
    const { name, width, height, duration, fps } = video.data;

    const timeBetweenFrames = (((1 / (fps || 0)) * step) * 1000).toFixed(2)

    return (
        <div className='form-video-extra-info mt-1'>
            <div className='form-video-extra-info-row'>
                <p>{t("VideoRange.ExtraInfo.fileName")}</p>
                <p>{name}</p>
            </div>
            <div className='form-video-extra-info-row'>
                <p>{t("VideoRange.ExtraInfo.totalLenght")}</p>
                <p>{duration.toFixed(2)}s</p>
            </div>
            <div className='form-video-extra-info-row'>
                <p>{t("VideoRange.ExtraInfo.timeBetweenFrame")}</p>
                <p>{timeBetweenFrames}ms</p>
            </div>
            <div className='form-video-extra-info-row'>
                <p>{t("VideoRange.ExtraInfo.resolution")}</p>
                <p>{`${width} x ${height}`}</p>
            </div>
            <div className='form-video-extra-info-row'>
                <p>FPS: </p>
                <p>{fps}</p>
            </div>
        </div>
    )
}
