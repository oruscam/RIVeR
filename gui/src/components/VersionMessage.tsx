import { useMemo, useState } from "react";
import { useUiSlice } from "../hooks";
import { useTranslation } from "react-i18next";
import { COLORS } from "../constants/constants";

export const VersionMessage = () => {
    const [ versionMessage, setVersionMessage ] = useState("")
    const { isLatestVersion, latestVersion } = useUiSlice();
    const { t } = useTranslation();

    const latestLink = `https://github.com/oruscam/RIVeR/releases/tag/v${latestVersion}`;

    useMemo(() => {
        if (isLatestVersion) {
            setVersionMessage("latest");
        } else {
            setVersionMessage("update");
        }
    }, [isLatestVersion])

  return (
    <div id="version-message">
        <p style={{color: isLatestVersion === false ? COLORS.RED : ''}}>{t(`MainPage.Version.${versionMessage}`)}</p>
        {
            isLatestVersion === false && (
                <a href={latestLink} target="_blank" rel="noopener noreferrer" style={{color: isLatestVersion === false ? COLORS.RED : ''}}> {latestVersion} </a>
            )
        }
    </div>
  )
}
