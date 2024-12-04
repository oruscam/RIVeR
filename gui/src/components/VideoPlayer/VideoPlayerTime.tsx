import { formatTime } from "../../helpers";

export const VideoPlayerTime = ({ duration, currentTime }: { duration: number, currentTime: number }) => {
  return (
    <div className='video-player-time'> { formatTime( currentTime, 'mm:ss' )} / { formatTime( duration, 'mm:ss')}</div>
  )
}
