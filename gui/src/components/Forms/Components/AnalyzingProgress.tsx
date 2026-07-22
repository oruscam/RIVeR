import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDataSlice } from "../../../hooks";
import { Loading } from "../../Loading";
import { parseCliProgress } from "../../../helpers/parseCliProgress";

export const AnalyzingProgress = ({resetProgress} : {resetProgress: boolean}) => {
    const { t } = useTranslation();
    const { isBackendWorking, quiver } = useDataSlice();
    const [percentage, setPercentage] = useState<string>('');
    const [time, setTime] = useState<string>('');

    const legend = t('Analizing.remainingTime');

    useEffect(() => {
        const handleRiverCliMessage = (_event: any, text: string) => {
        const parsed = parseCliProgress(text);
        let newPercentage = parsed.percentage;
        let newTime = parsed.time;

        if (isBackendWorking === false && quiver !== null) {
            newPercentage = '100%';
            newTime = '00:00';
        }

        if (newPercentage !== percentage) {
            setPercentage(newPercentage);
        }

        if (newTime !== time) {
            setTime(legend + newTime);
        }
        };

        window.ipcRenderer.on('river-cli-message', handleRiverCliMessage);

        // Cleanup function to remove the listener
        return () => {
        window.ipcRenderer.removeListener('river-cli-message', handleRiverCliMessage);
        };
    }, [percentage, time]);

    useEffect(() => {
        if (resetProgress) {
            setPercentage('');
            setTime('');
        }
    }, [resetProgress]);

    return (
        <div className="analize-output mt-2">
            {
                percentage !== '' && (
                    <Loading percentage={percentage} time={time} size={"big"} isComplete={percentage === '100%'}/>
                )
            }
        </div>
    )
}