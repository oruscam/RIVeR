export interface SpectrumExtent {
  kxMin: number;
  kxMax: number;
  ktMin: number;
  ktMax: number;
}

/**
 * Map a dispersion curve from wavenumber/frequency space to view pixels,
 * as an SVG polyline `points` string.
 *
 * The spectrum image spans the extent exactly, so kx maps linearly across the
 * width. kt is inverted because SVG's y axis grows downward while frequency
 * grows upward — without this the curves would appear mirrored against the
 * energy ridge they are supposed to trace.
 */
export const curveToPolylinePoints = (
  curve: [number, number][],
  extent: SpectrumExtent,
  viewWidth: number,
  viewHeight: number
): string => {
  const kxSpan = extent.kxMax - extent.kxMin || 1;
  const ktSpan = extent.ktMax - extent.ktMin || 1;

  return curve
    .map(([kx, kt]) => {
      const x = ((kx - extent.kxMin) / kxSpan) * viewWidth;
      const y = ((extent.ktMax - kt) / ktSpan) * viewHeight;
      return `${Number(x.toFixed(2))},${Number(y.toFixed(2))}`;
    })
    .join(' ');
};
