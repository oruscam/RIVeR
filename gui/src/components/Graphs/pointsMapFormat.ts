/** A map coordinate is a position, not a quantity: no thousands separators. */
export const coordTick = (value: number): string => String(Math.round(value));

/** "30 m", not "30.00 m": at most two decimals, and none that are zero. */
export const scaleBarLabel = (lengthInUnit: number, unit: string): string =>
  `${parseFloat(lengthInUnit.toFixed(2))} ${unit}`;
