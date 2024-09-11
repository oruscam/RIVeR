import  { useEffect, useRef, useState } from 'react'

interface VideoPlayerSeekBarProps {
  bufferAmount: number;
  progressAmount: number;
  setProgressAmount: React.Dispatch<React.SetStateAction<number>>;
  control: {
    play: boolean;
  };
  videoRef: React.RefObject<HTMLVideoElement>;
  setControl: React.Dispatch<React.SetStateAction<{ play: boolean, volume: boolean }>>;
}

export const VideoPlayerSeekBar = ({ bufferAmount, progressAmount, setProgressAmount, control, videoRef, setControl }: VideoPlayerSeekBarProps) => {
    const seekBar = useRef<HTMLDivElement>(null);
    const [scrubbing, setScrubbing] = useState<boolean>(false);

    const onScrubStart = (event: React.MouseEvent<HTMLDivElement>) => {
      if (seekBar.current) {
        setScrubbing(true);
        if (videoRef.current && control.play) {
          setControl(prevControl => ({...prevControl, play: true}))
          videoRef.current.pause();
        }
        const progress = Math.min(
          Math.max(
            ((event.clientX - seekBar.current.offsetLeft) * 100) / seekBar.current.clientWidth,
            0
          ),
          100
        );
        setProgressAmount(progress);
      }
    }
  
    const onScrub = (event: MouseEvent) => {
      if (seekBar.current && scrubbing){
        const progress = Math.min(
          Math.max(
            ((event.clientX - seekBar.current.offsetLeft) * 100 ) / seekBar.current.clientWidth, 0 
          ), 100
        );
        setProgressAmount(progress);
      }
    }
  
    const onScrubEnd = (event: MouseEvent) => {
      if (seekBar.current && scrubbing){
        setScrubbing(false)
        if(videoRef.current){
          const percentage = Math.min(
            Math.max(
              (event.clientX - seekBar.current.offsetLeft) / seekBar.current.clientWidth , 0
            ), 1
          );
          const time = percentage * videoRef.current.duration;
          videoRef.current.currentTime = time;
          if( videoRef.current && !control.play){
            setControl(prevControl => ({...prevControl, play: true}))
            videoRef.current.play()
          }
        }
      }
    }
  
    useEffect(() => {
      document.addEventListener("mousemove", onScrub);
      document.addEventListener("mouseup", onScrubEnd);
      
      return () => {
        document.removeEventListener("mousemove", onScrub);
        document.removeEventListener("mouseup", onScrubEnd);
      }
    }, [scrubbing])

    return (
      <div className='video-player-seekbar'
        ref={seekBar}
        onMouseDown={onScrubStart}
      >
        <span id='background-track'></span>
        <span id='buffered-track' style={{ "--buffer": `${bufferAmount}%` } as React.CSSProperties}></span>
        <span id='progress-track' style={{ "--progress": `${progressAmount}%` } as React.CSSProperties}></span>
        <span id='thumb' style={{ "--progress": `${progressAmount}%` } as React.CSSProperties}></span>
      </div>
    )
}
