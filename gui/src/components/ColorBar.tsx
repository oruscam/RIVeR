import { useEffect, useState } from "react";
import { COLORS } from "../constants/constants";
import { useDataSlice, useUiSlice } from "../hooks";
import { GrRefresh } from "react-icons/gr";
import { useWizard } from "react-use-wizard";

const colors = [
    COLORS.LIGHT_BLUE, // Light Blue - Lowest
    COLORS.GREEN, // Green - Low-mid
    COLORS.YELLOW, // Orange-Yellow - Mid-high
    COLORS.RED //Red-Orange - Highest
];

export const ColorBar = ({ min, max }: { min: number, max: number}) => {
    const [defaultMin, setDefaultMin] = useState(min.toFixed(2));
    const [defaultMax, setDefaultMax] = useState(max.toFixed(2));

    const { activeStep } = useWizard();
    const { screenSizes } = useUiSlice();
    const { imageWidth } = screenSizes;

    const { onSetManualColorbarLimits, colorbarLimits } = useDataSlice();

    const gradient = `linear-gradient(to right, ${colors.join(",")})`;

    const handleOnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.currentTarget.id === "min") {
            setDefaultMin(event.currentTarget.value);
        } else {
            setDefaultMax(event.currentTarget.value);
        }
    }

    const applyChanges = () => {
        onSetManualColorbarLimits(parseFloat(defaultMin), parseFloat(defaultMax), false);
    }

    const onRefresh = () => {
        onSetManualColorbarLimits(0, 0, true);
    }

    useEffect(() => {
        setDefaultMin(min.toFixed(2));
        setDefaultMax(max.toFixed(2));
    }, [min, max]);

    return (
        <div className="colorbar-container" style={{width: imageWidth as number * 0.35}}>
            <input value={defaultMin} className="colorbar-input" type="number" onChange={handleOnChange} id="min" onKeyDown={applyChanges} onBlur={applyChanges}/>
            <div className="colorbar" style={{ background: gradient }}/>
            <input value={defaultMax} className="colorbar-input" type="number" onChange={handleOnChange} id="max" onKeyDown={applyChanges} onBlur={applyChanges}/>

            { activeStep !== 7 && (
                <button onClick={onRefresh} disabled={colorbarLimits.default}>  
                    <GrRefresh />
                </button>
            )}
        </div>
    )
}