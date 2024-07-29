import { useRef, useState } from 'react'
import '../components.css'
import { VideoPlayerButtons } from './VideoPlayerButtons.js'
import { VideoPlayerSeekBar } from './VideoPlayerSeekBar.js'
import { VideoPlayerTime } from './VideoPlayerTime.js'

export const VideoPlayer = ({ fileURL }: { fileURL: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [bufferAmount, setBufferAmount] = useState<number>(0)
  const [progressAmount, setProgressAmount] = useState<number>(0)
  const [control, setControl] = useState<{ play: boolean; volume: boolean }>({
    play: false,
    volume: false,
  })
  const [currentTime, setCurrentTime] = useState<number>(0)
  const [duration, setDuration] = useState<number>(0)

  const onVideoProgress = () => {
    if (videoRef.current) {
      if (duration > 0) {
        for (let i = 0; i < videoRef.current.buffered.length; i++) {
          if (
            videoRef.current.buffered.start(videoRef.current.buffered.length - 1 + i) <
            (videoRef.current.currentTime || 0)
          ) {
            setBufferAmount(
              (videoRef.current.buffered.end(videoRef.current.buffered.length - 1 + i) * 100) /
                duration
            )
            break
          }
        }
      }
    }
  }

  const onVideoTimeUpdate = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0)
      if (duration > 0) {
        setCurrentTime(videoRef.current.currentTime || 0)
        setProgressAmount((videoRef.current.currentTime || 0) / duration * 100)
      }
    }
  }

  

  return (
    <>
      {fileURL ? (
        <div className='video-player'>
          <div className='video'>
            <video
              className='video'
              loop={true}
              ref={videoRef}
              src={fileURL}
              autoPlay={false}
              controls={false}
              muted={control.volume}
              onProgress={onVideoProgress}
              onTimeUpdate={onVideoTimeUpdate}
              id='video'
            ></video>
          </div>

          <div className='video-controls'>
            <VideoPlayerTime duration={duration} currentTime={currentTime}></VideoPlayerTime>
            <VideoPlayerSeekBar
              bufferAmount={bufferAmount}
              progressAmount={progressAmount}
              setProgressAmount={setProgressAmount}
              videoRef={videoRef}
              setControl={setControl}
              control={control}
            ></VideoPlayerSeekBar>

            <VideoPlayerButtons
              videoRef={videoRef}
              setControl={setControl}
              control={control}
            ></VideoPlayerButtons>
          </div>
          <div className='duration'>
          </div>
        </div>
      ) : (
        <h1>ERROR EN VIDEO PLAYER</h1>
      )}
    </>
  )
}
