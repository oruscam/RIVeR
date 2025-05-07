import { useMemo, useState } from "react";
import { useUiSlice } from "../hooks";
import { useTranslation } from "react-i18next";

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
        <p>{t(`MainPage.Version.${versionMessage}`)}</p>
        {
            isLatestVersion === false && (
                <a href={latestLink} target="_blank" rel="noopener noreferrer"> {latestVersion} </a>
            )
        }
    </div>
  )
}
