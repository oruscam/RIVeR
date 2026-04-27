import { useState, useEffect, useRef } from "react";
import { useDataSlice, useProjectSlice, useSectionSlice } from "../../../hooks"
import { getQuiverValues } from "../../../../commons/vectors";
import { useTranslation } from "react-i18next";
import { ExportBtn } from "../../CustomIcons/ExportBtn";

export const ExportMp4 = () => {
    const { t } = useTranslation();
    const { onExportGif, colorbarLimits, quiver, images } = useDataSlice();
    const { video, projectDetails } = useProjectSlice();
    const { transformationMatrix } = useSectionSlice();
    const { width, height, fps } = video.data;
    const { factor, step } = video.parameters;

    const [isCreatingGif, setIsCreatingGif] = useState<boolean>(false);
    const [open, setOpen] = useState<boolean>(false);
    const ref = useRef<HTMLDivElement>(null);

    const [minValue, setMinValue] = useState<number>(colorbarLimits.min !== null ? colorbarLimits.min : 0);
    const [maxValue, setMaxValue] = useState<number>(colorbarLimits.max !== null ? colorbarLimits.max : 0);

    useEffect(() => {
        if (colorbarLimits.min !== null && colorbarLimits.max !== null) {
            setMinValue(colorbarLimits.min);
            setMaxValue(colorbarLimits.max);
        } else if (quiver) {
            const showMedian = quiver.test === false;
            const { min, max } = getQuiverValues(quiver, showMedian, images.active, step, fps, transformationMatrix);
            setMinValue(min);
            setMaxValue(max);
        }
    }, [colorbarLimits, quiver, images.active, step, fps, transformationMatrix]);

    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    const originalWidth = width * factor;
    const originalHeight = height * factor;

    const handleSelectResolution = (factorValue: number, event: React.MouseEvent) => {
        event.stopPropagation();
        setOpen(false);
        if (isCreatingGif) return;

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
            },
            unitSistem: projectDetails.unitSistem,
        }).then(() => {
            setIsCreatingGif(false);
        }).catch((error) => {
            console.error('Error creating mp4:', error);
            setIsCreatingGif(false);
        })
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

    const resolutions = [
        { label: `${originalWidth}x${originalHeight}`, factor: 1 },
        { label: `${originalWidth * 0.75}x${originalHeight * 0.75}`, factor: 0.75 },
        { label: `${originalWidth * 0.5}x${originalHeight * 0.5}`, factor: 0.5 },
        { label: `${originalWidth * 0.25}x${originalHeight * 0.25}`, factor: 0.25 },
    ];

    return (
        <div className="lwrap" ref={ref} style={{ opacity: isPosibleToCreateGif() ? 1 : 0.5, pointerEvents: isPosibleToCreateGif() ? 'auto' : 'none' }}>
            <ExportBtn 
                className={open ? "active" : ""}
                isCreating={isCreatingGif} 
                onClick={() => setOpen(v => !v)} 
                title={t("Report.Form.resolution")}
            />
            
            <div className={`ldrop ${open ? "open" : ""}`} style={{ minWidth: 150, top: "calc(100% + 8px)", bottom: "auto", transformOrigin: "top right" }}>
                {resolutions.map((res, index) => (
                    <div key={index} className="litem" onClick={(e) => handleSelectResolution(res.factor, e)}>
                        <span>{res.factor * 100}%</span>
                        <span style={{ marginLeft: "auto", opacity: 0.6, fontSize: "0.85em" }}>{res.label}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}