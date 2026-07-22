import { useEffect, useState } from 'react';
import { COLORS, UNIT_CONVERSIONS, UNITS } from '../constants/constants';
import { useDataSlice, useProjectSlice, useUiSlice } from '../hooks';
import { GrRefresh } from 'react-icons/gr';
import { useWizard } from 'react-use-wizard';

const colors = [
  COLORS.LIGHT_BLUE, // Light Blue - Lowest
  COLORS.GREEN, // Green - Low-mid
  COLORS.YELLOW, // Orange-Yellow - Mid-high
  COLORS.RED, //Red-Orange - Highest
];

export const ColorBar = ({ min, max }: { min: number; max: number }) => {
  const { projectDetails } = useProjectSlice();
  const isImperial = projectDetails.unitSistem === 'imperial';
  const toDisplay = (v: number) => (isImperial ? v * UNIT_CONVERSIONS.M_TO_FT : v);
  const toSI = (v: number) => (isImperial ? v * UNIT_CONVERSIONS.FT_TO_M : v);
  const unitLabel = isImperial ? UNITS.IMPERIAL.VELOCITY : UNITS.SI.VELOCITY;

  const [defaultMin, setDefaultMin] = useState(toDisplay(min).toFixed(2));
  const [defaultMax, setDefaultMax] = useState(toDisplay(max).toFixed(2));

  const { activeStep } = useWizard();
  const { screenSizes } = useUiSlice();
  const { imageWidth } = screenSizes;

  const { onSetManualColorbarLimits, colorbarLimits } = useDataSlice();

  const gradient = `linear-gradient(to right, ${colors.join(',')})`;

  const handleOnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.currentTarget.id === 'min') {
      setDefaultMin(event.currentTarget.value);
    } else {
      setDefaultMax(event.currentTarget.value);
    }
  };

  const applyChanges = () => {
    const parsedMin = parseFloat(defaultMin);
    const parsedMax = parseFloat(defaultMax);
    if (parsedMin >= parsedMax) {
      setDefaultMin(toDisplay(min).toFixed(2));
      setDefaultMax(toDisplay(max).toFixed(2));
      return;
    }
    onSetManualColorbarLimits(toSI(parsedMin), toSI(parsedMax), false);
  };

  const onRefresh = () => {
    onSetManualColorbarLimits(0, 0, true);
  };

  useEffect(() => {
    setDefaultMin(toDisplay(min).toFixed(2));
    setDefaultMax(toDisplay(max).toFixed(2));
  }, [min, max, isImperial]);

  return (
    <div className="colorbar-container" style={{ width: (imageWidth as number) * 0.35 }}>
      <input
        value={defaultMin}
        className="colorbar-input"
        type="number"
        onChange={handleOnChange}
        id="min"
        onKeyDown={(e) => e.key === 'Enter' && applyChanges()}
        onBlur={applyChanges}
      />
      <div className="colorbar" style={{ background: gradient }} />
      <input
        value={defaultMax}
        className="colorbar-input"
        type="number"
        onChange={handleOnChange}
        id="max"
        onKeyDown={(e) => e.key === 'Enter' && applyChanges()}
        onBlur={applyChanges}
      />
      <span className="colorbar-unit-label">{unitLabel}</span>

      {activeStep !== 7 && (
        <button onClick={onRefresh} disabled={colorbarLimits.default}>
          <GrRefresh />
        </button>
      )}
    </div>
  );
};
