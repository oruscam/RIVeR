import { EyeBall } from './CrossSections/EyeBall'

export const SectionsHeader = ( { title } : { title: string}) => {
  return (
    <div className='sections-header'>
        <EyeBall></EyeBall>
        <h1 className='sections-title'> { title } </h1>
        <span></span>
    </div>
  )
}
