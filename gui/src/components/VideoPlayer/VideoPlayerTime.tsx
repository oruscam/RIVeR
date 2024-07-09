
const sec2Min = (sec: number) => {
    if ( sec === undefined){
        return {
            min: 0,
            sec: 0
        }
    }

    const min = Math.floor(sec / 60);
    const secRemain = (sec % 60).toFixed(4)
    return {
      min: min,
      sec: parseFloat(secRemain)
    };
  };

  
export const VideoPlayerTime = ({ duration, currentTime }: { duration: number, currentTime: number }) => {
    const { min: minDuration, sec: secDuration } = sec2Min(duration) 
    const { min: minCurrentTime, sec: secCurrentTime} = sec2Min(currentTime)

  return (
    <div className='video-player-time'> {minCurrentTime}:{secCurrentTime} / {minDuration}:{secDuration}</div>
  )
}
