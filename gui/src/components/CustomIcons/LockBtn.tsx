import { useEffect, useState } from "react";
import { useRipple } from "./useRipple";
import { Icons } from "./Icons";
import { useSectionSlice } from "../../hooks";
import { useWizard } from "react-use-wizard";
import { MODULE_NUMBER } from "../../constants/constants";
interface LockButtonProps {
    localExtraFields?: boolean;
    setLocalExtraFields?: any;
    footerElementID: string;
    headerElementID: string;
    disabled: boolean;
}

export function LockBtn({
    localExtraFields,
    setLocalExtraFields,
    footerElementID,
    headerElementID,
    disabled
}: LockButtonProps) {
    const { onSetExtraFields, sections, activeSection } = useSectionSlice();
    const { extraFields, name } = sections[activeSection];
    const { activeStep } = useWizard();
    const [locked, setLocked] = useState(true);
    const [shakeKey, setShakeKey] = useState(0);
    const [rpl, fire] = useRipple();


    const handleOnChange = () => {
        switch (activeStep) {
            case MODULE_NUMBER.CROSS_SECTIONS:
                if (extraFields) {
                    const header = name + '-' + headerElementID;
                    const headerElement = document.getElementById(header);
                    headerElement?.scrollIntoView({ behavior: 'smooth' });
                } else {
                    const footer = name + '-' + footerElementID;

                    const footerElement = document.getElementById(footer);
                    setTimeout(() => {
                        footerElement?.scrollIntoView({ behavior: 'smooth' });
                    }, 50);
                }
                onSetExtraFields();
                break;

            case MODULE_NUMBER.PIXEL_SIZE:
                if (extraFields) {
                    const headerElement = document.getElementById(headerElementID);
                    headerElement?.scrollIntoView({ behavior: 'smooth' });
                } else {
                    const footerElement = document.getElementById(footerElementID);
                    console.log('footerElementID', footerElementID);
                    setTimeout(() => {
                        footerElement?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                }
                setLocalExtraFields();
                break;

            case MODULE_NUMBER.VIDEO_RANGE:
                if (extraFields) {
                    const headerElement = document.getElementById(headerElementID);
                    headerElement?.scrollIntoView({ behavior: 'smooth' });
                } else {
                    const footerElement = document.getElementById(footerElementID);
                    setTimeout(() => {
                        footerElement?.scrollIntoView({ behavior: 'smooth' });
                    }, 50);
                }
                setLocalExtraFields(!localExtraFields);
                break;

            case MODULE_NUMBER.PROCESSING:
                if (localExtraFields) {
                    const headerElement = document.getElementById(headerElementID);
                    headerElement?.scrollIntoView({ behavior: 'smooth' });
                } else {
                    const footerElement = document.getElementById(footerElementID);
                    setTimeout(() => {
                        footerElement?.scrollIntoView({ behavior: 'smooth' });
                    }, 50);
                }
                setLocalExtraFields(!localExtraFields);
                break;

            default:
                if (localExtraFields) {
                    const headerElement = document.getElementById(headerElementID);
                    headerElement?.scrollIntoView({ behavior: 'smooth' });
                } else {
                    const footerElement = document.getElementById(footerElementID);
                    setTimeout(() => {
                        footerElement?.scrollIntoView({ behavior: 'smooth' });
                    }, 50);
                }
                setLocalExtraFields(!localExtraFields);
                break;
        }
    };

    const toggle = () => {
        handleOnChange();
        if (locked) setShakeKey(k => k + 1);
        fire("var(--primary-text-color, #888)");
        setLocked(v => !v);
    };

    useEffect(() => {
        if (localExtraFields !== undefined) {
            setLocked(!localExtraFields);
        } else {
            setLocked(!extraFields);
        }
    }, [extraFields, activeSection, localExtraFields]);


    return (
        <div className="row">
            <button
                type="button"
                className={`ib ${locked ? "" : ""}`}
                disabled={disabled}
                onClick={toggle}
            >
                {rpl}
                <span key={shakeKey} className={`cl ${locked ? "show" : "hide"} ${shakeKey > 0 ? "wiggle" : ""}`}>

                    {Icons.Lock("currentColor")}
                </span>
                <span className={`cl ${locked ? "hide" : "show"}`}>
                    {Icons.Unlock("currentColor")}
                </span>
            </button>
        </div>
    );
}
