import { useDataSlice } from "../hooks"

export const Loading = () => {
  const {sections, video, projectDirectory} = useDataSlice();

  console.log(sections)
  console.log(video)
  console.log(projectDirectory)




  return (
    <div className='loader'></div>
  )
}
