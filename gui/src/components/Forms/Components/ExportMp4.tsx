import { useState } from "react";
import { useDataSlice, useProjectSlice } from "../../../hooks"
import { useTranslation } from "react-i18next";
import { ButtonLock } from "../../ButtonLock";
import { ExportBtn } from "../../CustomIcons/ExportBtn";
import { LockBtn } from "../../CustomIcons/LockBtn";

export const ExportMp4 = () => {
    const { t } = useTranslation();
    const { onExportGif, colorbarLimits, onSetManualColorbarLimits } = useDataSlice();
    const { video } = useProjectSlice();
    const { width, height, fps } = video.data;
    const { factor, step } = video.parameters;

    const [isCreatingGif, setIsCreatingGif] = useState<boolean>(false);
    const [resolutionLocked, setResolutionLocked] = useState<boolean>(false);

    const [minValue, setMinValue] = useState<number>(colorbarLimits.min !== null ? colorbarLimits.min : 0);
    const [maxValue, setMaxValue] = useState<number>(colorbarLimits.max !== null ? colorbarLimits.max : 0);

    const originalWidth = width * factor;
    const originalHeight = height * factor;

    const onClickExportGif = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        if (isCreatingGif) return;

        let factorValue = 0.5;
        if (resolutionLocked) {
            const resolution = document.getElementById('resolution-gif') as HTMLSelectElement;
            if (resolution) {
                factorValue = parseFloat(resolution.value);
            }
        }

        setIsCreatingGif(true);

        onExportGif({
            image: {
                width: originalWidth,
                height: originalHeight,
            },
            factor: factorValue,
            fps: fps,
            step: step,
            colorbarLimits: {
                min: minValue,
                max: maxValue,
            }
        }).then(() => {
            setIsCreatingGif(false);
        }).catch((error) => {
            console.error('Error creating gif:', error);
            setIsCreatingGif(false);
        })
    }

    const handleOnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.currentTarget.id === "min") {
            setMinValue(parseFloat(event.currentTarget.value));
        } else {
            setMaxValue(parseFloat(event.currentTarget.value));
        }
    }

    const applyChanges = () => {
        onSetManualColorbarLimits(minValue, maxValue, false);
    }

    const isPosibleToCreateGif = (): boolean => {
        if (minValue === 0 && maxValue === 0) {
            return false
        } else if (minValue >= maxValue) {
            return false
        } else if (typeof (minValue) !== "number" && typeof (maxValue) !== "number") {
            return false
        } else {
            return true
        }
    }

    return (
        <>
            <div style={{ opacity: isPosibleToCreateGif() ? 1 : 0.5, pointerEvents: isPosibleToCreateGif() ? 'auto' : 'none' }}>
                <ExportBtn isCreating={isCreatingGif} onClick={onClickExportGif} />
            </div>
            <div className="footer">
                <LockBtn
                    localExtraFields={resolutionLocked}
                    setLocalExtraFields={setResolutionLocked}
                    disabled={false}
                    headerElementID=""
                    footerElementID=""
                />
            </div>
            {resolutionLocked && (
                <div className="input-container-2 mt-2">
                    <label className="read-only me-1" htmlFor=""> {t("Report.Form.resolution")} </label>
                    <select
                        className="input-field input-field-select"
                        id="resolution-gif"
                        defaultValue="0.50"
                    >
                        <option value="1">{originalWidth}x{originalHeight}</option>
                        <option value="0.75">{originalWidth * 0.75}x{originalHeight * 0.75}</option>
                        <option value="0.50">{originalWidth * 0.5}x{originalHeight * 0.5}</option>
                        <option value="0.25">{originalWidth * 0.25}x{originalHeight * 0.25}</option>
                    </select>
                </div>
            )}
            {/* <div className="simple-input-container mt-2">
                <label id="colorbar-label"> {t("Report.Form.colorbarLimits")} </label>
            </div> */}
            {/* <div className="input-container-2 mt-1">
                <label className="read-only me-2">{t("Report.Form.minLimit")}</label>
                <input
                    className="input-field"
                    id="min"
                    type="number"
                    step="any"
                    defaultValue={minValue}
                    onChange={handleOnChange}
                    onKeyDown={applyChanges}
                    onBlur={applyChanges}
                />
            </div>
            <div className="input-container-2 mt-1">
                <label className="read-only me-2"> {t("Report.Form.maxLimit")} </label>
                <input
                    className="input-field"
                    id="max"
                    type="number"
                    step="any"
                    defaultValue={maxValue}
                    onChange={handleOnChange}
                    onKeyDown={applyChanges}
                    onBlur={applyChanges}
                />
            </div> */}

        </>
    )
}