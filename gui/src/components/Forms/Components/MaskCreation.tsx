import { GrTrash } from "react-icons/gr";
import { useDataSlice } from "../../../hooks"
import { useTranslation } from "react-i18next";
import { EyeBall } from "../../CrossSections";

export const MaskCreation = () => {
    const { t } = useTranslation()
    const { processing, onAddMask, onUpdateActiveMask, onDeleteMask } = useDataSlice()
    const { masks, activeMaskIndex } = processing;

    return (
        <div className="hard-mode-processing">
            <div className='input-container-2 mt-1'>
                <button className='form-button wizard-button me-1' type="button" onClick={() => onAddMask()}>Add New mask</button>
            </div>
    
            {
                masks !== undefined && masks.map((_mask, index) =>
                    <div key={index} className='switch-container mt-1'>
                        <h3 className='field-title'> {t('mask')} {index + 1} </h3>
                        <div className='mask-actions'>
                            <EyeBall key={index} action={onUpdateActiveMask} active={activeMaskIndex === index} index={index}/>
                            <GrTrash className='trash-icon' onClick={() => onDeleteMask(index)}/>
                        </div>
                    </div>
                )
            }
        </div>
    )
}