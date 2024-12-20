import { Icon } from '../Icon'
import './report.css'
import { drone, oblique } from '../../assets/icons/icons.js'
import { useSectionSlice } from '../../hooks/useSectionSlice.js'
import { useProjectSlice } from '../../hooks/useProjectSlice.js'

export const Header = () => {
  const { sections } = useSectionSlice();
  const { projectDetails, type } = useProjectSlice();
  const { riverName, site, meditionDate} = projectDetails


  const divider = sections.length - 1

  const sum = sections.reduce((acc, section) => {
    if (section.data) {
      // Filtra los elementos que no deben ser sumados
      const filteredQ = section.data.Q.filter(q => {
        // Reemplaza esta condición con la lógica para excluir elementos no deseados
        return q !== null && q !== undefined && q >= 0;
      });

      return acc + filteredQ.reduce((acc, q) => acc + q, 0);
    }
    return acc;
  }, 0);

  const average = sum / (divider !== 0 ? divider : 1)

  return (
    <div id="report-header-container">
      <div id='header-icon-container'>
        <Icon path={ type === 'uav' ? drone : oblique } id='header-icon'/>      
      </div>
      <div id='header-title-container'>
        <h1 className='header-title-text mt-1'> {riverName}@{site}</h1>
        <h3 id='header-title-date'> { meditionDate }</h3>
      </div>
      <div id='header-total'>
        <h1 className='header-title-text'>Total Q: {average.toFixed(2)}  m&sup3;/s </h1>
      </div>
    </div>
  )
}
