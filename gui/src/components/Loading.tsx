import { useUiSlice } from "../hooks"

export const Loading = () => {
  const { message } = useUiSlice()
  
  return (
    <div className="loading-container">
      <div className='loader'></div>
      { message && <p>{message}</p>}
    </div>
  )
}
