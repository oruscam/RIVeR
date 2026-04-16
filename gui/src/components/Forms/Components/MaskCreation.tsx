import { useDataSlice } from "../../../hooks"
import { useTranslation } from "react-i18next";
import { EyeBtn } from "../../CustomIcons/EyeBtn";
import { TrashBtn } from "../../CustomIcons/TrashBtn";


export const MaskCreation = () => {
    const { t } = useTranslation()
    const { processing, onToggleMaskVisibility, onDeleteMask } = useDataSlice()
    const { masks, visibleMaskIndices } = processing;

    return (
        <div className="hard-mode-processing">
            {
                masks !== undefined && masks.map((_mask, index) =>
                    <div key={index} className='switch-container mt-1'>
                        <h3 className='field-title'> {t('CrossSections.mask')} {index + 1} </h3>
                        <div className='mask-actions'>
                            <EyeBtn
                                key={index}
                                action={onToggleMaskVisibility}
                                active={visibleMaskIndices.includes(index)}
                                index={index}
                            />
                            <TrashBtn onClickFunction={() => onDeleteMask(index)} />
                        </div>
                    </div>
                )
            }
        </div>
    )
}