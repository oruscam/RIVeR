import { Icon } from '../Icon'
import './report.css'
import { drone } from '../../assets/icons/icons.js'

export const Header = () => {
  return (
    <div id="report-header-container">
      <div id='header-icon-container'>
        <Icon path={drone} id='header-icon'/>      
      </div>
      <div id='header-title-container'>
        <h1 className='header-title-text mt-1'>Castor River @ Bridge</h1>
        <h3 id='header-title-date'>30/10/2022 10:25</h3>
      </div>
      <div id='header-total'>
        <h1 className='header-title-text'>Total Q: 122.44 m&sup3;/s </h1>
      </div>
    </div>
  )
}
