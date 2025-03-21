import { Icon } from "../Icon";
import "./report.css";
import { drone, oblique, ipcam } from "../../assets/icons/icons.js";
import { useSectionSlice } from "../../hooks/useSectionSlice.js";
import { useProjectSlice } from "../../hooks/useProjectSlice.js";
import { getUnit } from "../../helpers/unitSistem.js";

export const Header = () => {
  const { sections } = useSectionSlice();
  const { projectDetails, type } = useProjectSlice();
  const { riverName, site, meditionDate, unitSistem } = projectDetails;

  const divider = sections.length;

  const sum = sections.reduce((acc, section) => {
    if (section.data) {
      // Filtra los elementos que no deben ser sumados
      const filteredQ = section.data.Q.filter((q) => {
        // Reemplaza esta condición con la lógica para excluir elementos no deseados
        return q !== null && q !== undefined && q >= 0;
      });

      return acc + filteredQ.reduce((acc, q) => acc + q, 0);
    }
    return acc;
  }, 0);

  const average = sum / (divider !== 0 ? divider : 1);

  return (
    <div id="report-header-container">
      <div id="header-icon-container">
        <Icon
          path={type === "uav" ? drone : type === "oblique" ? oblique : ipcam}
          id="header-icon"
        />
      </div>
      <div id="header-title-container">
        <h1 className="header-title-text mt-1">
          {" "}
          {riverName}@{site}
        </h1>
        <h3 id="header-title-date"> {meditionDate}</h3>
      </div>
      <div id="header-total">
        <h1 className="header-title-text">
          Total Q: {average.toFixed(2)} {getUnit(unitSistem, "flow")}
        </h1>
      </div>
    </div>
  );
};
