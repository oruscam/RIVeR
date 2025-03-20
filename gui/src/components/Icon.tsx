import { ReactSVG } from "react-svg";

export const Icon = ({
  path,
  className = "",
  id,
}: {
  path: string;
  className?: string;
  id?: string;
}) => {
  return (
    <ReactSVG src={path} className={`svg-icon ${className}`} id={id}></ReactSVG>
  );
};
