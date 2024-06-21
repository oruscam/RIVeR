import { ReactSVG } from 'react-svg'

export const Icon = ({ path, className = '' }: { path: string, className?: string }) => {

  return (
    <ReactSVG src={path} className={`svg-icon ${className}`}></ReactSVG>
  )
}
