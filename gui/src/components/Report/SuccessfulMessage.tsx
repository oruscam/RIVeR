import { useTranslation } from "react-i18next"
import { check } from "../../assets/icons/icons"
import { Icon } from "../Icon"
import { useProjectSlice } from "../../hooks"

export const SuccessfulMessage = () => {
    const { t } = useTranslation()
    const { projectDirectory } = useProjectSlice()

    return (
        <div id="successful-container" className="mt-4">
            <Icon path={check} id="check-icon"/>
            
            <div id="successful-message-container">
                <h3 id="successful-title">{t('Report.Success.title')}</h3>
                <p id="successful-message" className="mt-1">{t('Report.Success.message')}</p>
                <p className="mt-1"><span>{projectDirectory}</span></p>
            </div>
        </div>
    )
}