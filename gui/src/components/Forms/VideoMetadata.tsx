import { useTranslation } from 'react-i18next'
import { useProjectSlice } from '../../hooks'

export const VideoMetadata = () => {
    const { t } = useTranslation()
    const { video } = useProjectSlice()
    const { name, width, height, duration, fps } = video.data;

    return (
        <div className='form-video-extra-info mt-1'>
            <div className='form-video-extra-info-row'>
                <p>{t("VideoRange.ExtraInfo.fileName")}</p>
                <p>{name}</p>
            </div>
            <div className='form-video-extra-info-row'>
                <p>{t("VideoRange.ExtraInfo.totalLength")}</p>
                <p>{duration.toFixed(2)}s</p>
            </div>

            <div className='form-video-extra-info-row'>
                <p>{t("VideoRange.ExtraInfo.resolution")}</p>
                <p>{`${width} x ${height}`}</p>
            </div>
            <div className='form-video-extra-info-row'>
                <p> FPS: </p>
                <p>{fps}</p>
            </div>
        </div>
    )
}
