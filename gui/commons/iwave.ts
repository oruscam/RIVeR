/**
 * IWaVE parameters shared by the Electron main process and the renderer.
 *
 * The GUI runs IWaVE either fully automatic (nothing sent, the CLI computes every value from
 * LSPIV/STIV and the ROI) or fully manual: as soon as the user edits one of flow type, window
 * size or max velocity, all three are frozen exactly as shown and sent on every analysis.
 */

export type IwaveFlowType = 'waves' | 'no-waves';

export interface IwaveManual {
  flowType: IwaveFlowType;
  windowSize: number;
  smax: number;
}

export interface IwaveDefaults {
  windowSize: number;
  smax: number;
  flowType: IwaveFlowType;
  /** "lspiv", "stiv", "lspiv+stiv", or "none" before any analysis. */
  estimatedFrom: string;
  clipS: number | null;
  /** Seconds of frames IWaVE actually uses (frame cap applied). */
  iwaveS: number | null;
  shortClip: boolean;
  /** True when windowSize is IWAVE_FALLBACK_DEFAULTS.windowSize rather than a value the CLI
   *  actually computed for this project (no answer yet, or the fetch failed or was malformed).
   *  isIwaveWindowStale must never compare against these: the fallback's 2.5 m is not a real
   *  automatic value, so comparing against it would fire on every mount and on every failure. */
  isFallback: boolean;
}

/** processing.iwave_manual in settings.json. */
export interface SettingsIwaveManual {
  flow_type: IwaveFlowType;
  window_size: number;
  smax: number;
}

export const IWAVE_SMAX_LIMIT = 10;
export const IWAVE_STALE_WINDOW_FRACTION = 0.2;

/** Used until (or when) the iwave-defaults CLI call answers; matches the CLI's own fallbacks. */
export const IWAVE_FALLBACK_DEFAULTS: IwaveDefaults = {
  windowSize: 2.5,
  smax: 5,
  flowType: 'waves',
  estimatedFrom: 'none',
  clipS: null,
  iwaveS: null,
  shortClip: false,
  isFallback: true,
};

const isFlowType = (value: unknown): value is IwaveFlowType => value === 'waves' || value === 'no-waves';

const isPositiveNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

export function parseIwaveDefaults(data: unknown): IwaveDefaults {
  const raw = (data ?? {}) as Record<string, unknown>;
  const windowSizeIsReal = isPositiveNumber(raw.window_size);
  return {
    windowSize: windowSizeIsReal ? raw.window_size : IWAVE_FALLBACK_DEFAULTS.windowSize,
    smax: isPositiveNumber(raw.smax) ? raw.smax : IWAVE_FALLBACK_DEFAULTS.smax,
    flowType: isFlowType(raw.flow_type) ? raw.flow_type : IWAVE_FALLBACK_DEFAULTS.flowType,
    estimatedFrom:
      typeof raw.estimated_from === 'string' ? raw.estimated_from : IWAVE_FALLBACK_DEFAULTS.estimatedFrom,
    clipS: isPositiveNumber(raw.clip_s) ? raw.clip_s : null,
    iwaveS: isPositiveNumber(raw.iwave_s) ? raw.iwave_s : null,
    shortClip: raw.short_clip === true,
    // window_size is the field isIwaveWindowStale compares against, so its own presence (not
    // the payload's as a whole) decides whether this answer is trustworthy for that comparison.
    isFallback: !windowSizeIsReal,
  };
}

export function buildIwaveArgs(iwave: boolean, manual: IwaveManual | null): (string | number)[] {
  if (!iwave || manual === null) return [];
  return [
    '--iwave-flow-type',
    manual.flowType,
    '--iwave-window-size',
    manual.windowSize,
    '--iwave-smax',
    manual.smax,
  ];
}

export function parseIwaveNumber(field: 'windowSize' | 'smax', raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const value = Number(trimmed);
  if (!isPositiveNumber(value)) return null;
  if (field === 'smax' && value > IWAVE_SMAX_LIMIT) return null;
  return value;
}

/** Fields show 2 decimals; typing back exactly what is shown must not count as an edit. */
export function hasIwaveValueChanged(value: number, shown: number): boolean {
  return Math.abs(value - Number(shown.toFixed(2))) > 1e-9;
}

export function getShownIwaveValues(manual: IwaveManual | null, defaults: IwaveDefaults): IwaveManual {
  return manual ?? { flowType: defaults.flowType, windowSize: defaults.windowSize, smax: defaults.smax };
}

export function freezeIwaveManual(
  manual: IwaveManual | null,
  defaults: IwaveDefaults,
  change: Partial<IwaveManual>
): IwaveManual {
  return { ...getShownIwaveValues(manual, defaults), ...change };
}

export function isIwaveWindowStale(manual: IwaveManual | null, defaults: IwaveDefaults): boolean {
  if (manual === null || defaults.isFallback) return false;
  return Math.abs(manual.windowSize - defaults.windowSize) > IWAVE_STALE_WINDOW_FRACTION * defaults.windowSize;
}

export function toSettingsIwaveManual(manual: IwaveManual | null): SettingsIwaveManual | null {
  if (manual === null) return null;
  return { flow_type: manual.flowType, window_size: manual.windowSize, smax: manual.smax };
}

export function fromSettingsIwaveManual(raw: unknown): IwaveManual | null {
  if (raw === null || typeof raw !== 'object') return null;
  const { flow_type, window_size, smax } = raw as Record<string, unknown>;
  if (!isFlowType(flow_type) || !isPositiveNumber(window_size) || !isPositiveNumber(smax)) return null;
  if (smax > IWAVE_SMAX_LIMIT) return null;
  return { flowType: flow_type, windowSize: window_size, smax };
}
