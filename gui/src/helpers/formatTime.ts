export const formatTime = ( seconds : number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 100);
  
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(remainingSeconds).padStart(2, '0');
    const formattedMilliseconds = String(milliseconds).padStart(2, '0');
  
    return `${formattedMinutes}:${formattedSeconds}:${formattedMilliseconds}`;
}
