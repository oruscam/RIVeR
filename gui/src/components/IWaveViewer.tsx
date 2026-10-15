import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectSlice, useSectionSlice, useUiSlice } from '../hooks';
import {
  curveToPath,
  describeSpectrumPoint,
  fromPixel,
  getCellExtent,
  getNearestIndex,
  getSpectrumPixels,
  getTicks,
  parseColor,
  toPixel,
} from '../helpers';
import type { RgbColor, SpectrumAxis } from '../helpers';
import { getSpectrumRamp } from '../helpers/getCSSVar';
import { UNIT_CONVERSIONS, UNITS } from '../constants/constants';
import { Icons } from './CustomIcons/Icons';
import type { IwaveSpectraSidecar } from '../../electron/ipcMainHandlers/getIwaveSpectra';
import './components.css';
import './Graphs/graphs.css';

interface IWaveViewerProps {
  /** Renderer-loadable spectrum image paths, one slot per station (station id k
   *  at index k − 1), '' where iWave skipped the station or its fit failed. */
  spectrumPaths: string[];
  /** Why the active station has no spectrum, shown in place of the plot. */
  emptyLabel: string;
  /** Spectrum values, axes and dispersion curves; null when the sidecar is missing. */
  sidecar: IwaveSpectraSidecar | null;
  /** Index into the station list — which spectrum is currently selected. */
  activeStation: number;
  containerWidth: number;
  containerHeight: number;
}

type Curve = [number, number][];

/** One plot of the pair: a wavenumber-frequency plane and what is drawn on it. */
interface Panel {
  id: 'kx' | 'ky';
  /** Wavenumber cell centres; empty when only the image's extent is known. */
  k: number[];
  kExtent: { min: number; max: number };
  /** Spectrum values, lowest frequency first; null when only the PNG exists. */
  values: number[][] | null;
  href: string;
  gravity: Curve;
  advected: Curve;
}

interface Hover {
  panel: number;
  k: number;
  omega: number;
}

// The dark theme's ramp, used until the tokens are read and wherever a token
// fails to parse.
const FALLBACK_RAMP: RgbColor[] = [
  [10, 13, 18],
  [46, 125, 214],
  [169, 220, 255],
];

// Plot furniture, in px. The margins hold the tick labels and axis titles, so
// nothing but the hover crosshair is ever drawn on the data.
/** Clears the Frames / Space-time / Spectrum switch floating at the top. */
const TOP_BAND = 56;
const MARGIN = { top: 8, left: 70, bottom: 62 };
const PANEL_GAP = 22;
/** The station's readout strip resting on the panels, and the gap under it. */
const STRIP = { height: 28, gap: 8 };
/** The tip beside the crosshair: its offset from the cursor, and the room it
 *  needs before it flips to the other side. */
const TIP = { offset: 14, width: 250, height: 76 };
/** An older run's PNG is scaled to its single brightest cell, which leaves the
 *  ridge near black; this gain stands in for the robust maximum it lacks. */
const LEGACY_IMAGE_GAIN = 4;
/** A panel wider than this multiple of its height stretches the ridge flat. */
const MAX_PANEL_ASPECT = 1.15;

/** U+2212, the typographic minus: a hyphen reads as a dash beside tabular digits. */
const withMinus = (text: string): string => text.replace('-', '−');

const formatTick = (value: number): string => withMinus(String(Number(value.toFixed(2))));

/** Paints a plane's values into a data URL, one pixel per cell. */
const paintPlane = (values: number[][], clipMax: number, ramp: RgbColor[]): string => {
  const height = values.length;
  const width = height > 0 ? values[0].length : 0;
  if (width === 0 || typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return '';
  const image = context.createImageData(width, height);
  image.data.set(getSpectrumPixels(values, clipMax, ramp));
  context.putImageData(image, 0, 0);
  return canvas.toDataURL();
};

export const IWaveViewer = ({
  spectrumPaths,
  emptyLabel,
  sidecar,
  activeStation,
  containerWidth,
  containerHeight,
}: IWaveViewerProps) => {
  const { sections, activeSection } = useSectionSlice();
  const { projectDetails } = useProjectSlice();
  const { theme } = useUiSlice();
  const { t } = useTranslation();
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [ramp, setRamp] = useState<RgbColor[]>(FALLBACK_RAMP);
  // The colour maximum typed into the colour bar; null follows each station's own.
  const [manualMax, setManualMax] = useState<number | null>(null);
  const [maxInput, setMaxInput] = useState('');
  const [barHover, setBarHover] = useState<number | null>(null);
  const [showGravity, setShowGravity] = useState(true);
  const [showAdvected, setShowAdvected] = useState(true);
  const [hover, setHover] = useState<Hover | null>(null);

  // A layout effect, not a memo: the theme attribute is written to the DOM in
  // the same commit this component re-renders in, so the tokens only resolve
  // to the new theme once that commit has landed.
  useLayoutEffect(() => {
    setRamp(getSpectrumRamp().map((color, i) => parseColor(color) ?? FALLBACK_RAMP[i]));
  }, [theme]);

  const isImperial = projectDetails.unitSistem === 'imperial';
  const data = sections[activeSection]?.data;

  const stationId = activeStation + 1;
  const entry = useMemo(
    () =>
      (Array.isArray(sidecar?.stations) ? sidecar.stations.find((s) => s.station === stationId) : null) ?? null,
    [sidecar, stationId]
  );

  // Index the profiles by STATION ID. Spectra are only written for stations
  // iWave fitted, so the files alone leave gaps; Processing lays them out one
  // slot per station (alignStationImages), which makes the list position the
  // station index too. The profile arrays have an entry for every station,
  // 0-indexed with station id 1 at index 0 (ids come from np.arange(1, n+1),
  // compute_section.py:567).
  const profileIndex = stationId - 1;
  const velocity = data?.iwave_velocity_profile?.[profileIndex] ?? null;
  const quality = data?.iwave_quality_profile?.[profileIndex] ?? null;

  const imagePath = spectrumPaths[activeStation] ?? '';
  const planes = entry?.planes ?? null;
  const frequencies = planes && entry?.kt?.length ? entry.kt : null;
  const hasValues = planes !== null && frequencies !== null;
  const autoMax = entry?.display_max ?? 0;
  const clipMax = manualMax ?? autoMax;

  const planeImages = useMemo(
    () =>
      hasValues
        ? { kx: paintPlane(planes.kx.values, clipMax, ramp), ky: paintPlane(planes.ky.values, clipMax, ramp) }
        : null,
    [hasValues, planes, clipMax, ramp]
  );

  // The colour bar's field shows the maximum in use, and follows it from
  // station to station while it is automatic.
  useEffect(() => {
    setMaxInput(clipMax > 0 ? clipMax.toFixed(2) : '');
  }, [clipMax]);

  // An older sidecar gives the PNG's extent but not its cell count, which the
  // half-cell padding of the axes needs.
  useEffect(() => {
    setNatural(null);
    if (hasValues || !imagePath) return;
    let cancelled = false;
    const probe = new Image();
    probe.onload = () => {
      if (!cancelled) setNatural({ w: probe.naturalWidth, h: probe.naturalHeight });
    };
    probe.src = imagePath;
    return () => {
      cancelled = true;
    };
  }, [hasValues, imagePath]);

  if (spectrumPaths.every((p) => !p)) {
    return <p className="sti-empty">{t('Processing.iwaveNoData')}</p>;
  }

  if (!imagePath) {
    return (
      <div className="sti-viewer">
        <p className="sti-empty">
          {t('Processing.stiStation')} {stationId} · {emptyLabel}
        </p>
      </div>
    );
  }

  // Version 2 sidecars carry the values of both planes. An older one only has
  // the ky = 0 PNG and its extent, so that project shows one panel, recoloured
  // through an SVG filter, until iWave is run again.
  const panels: Panel[] = [];
  let omegaExtent = { min: 0, max: 1 };
  if (hasValues && planeImages) {
    omegaExtent = getCellExtent(frequencies);
    (['kx', 'ky'] as const).forEach((id) => {
      const plane = planes[id];
      panels.push({
        id,
        k: plane.k,
        kExtent: getCellExtent(plane.k),
        values: plane.values,
        href: planeImages[id],
        gravity: plane.curves.gravity,
        advected: plane.curves.turbulence,
      });
    });
  } else {
    // kx_min/kx_max and kt_min/kt_max are the first and last cell CENTRES; the
    // image covers half a cell more on every side, known once it has loaded.
    const halfK = natural && entry && natural.w > 1 ? (entry.kx_max - entry.kx_min) / (natural.w - 1) / 2 : 0;
    const halfOmega = natural && entry && natural.h > 1 ? (entry.kt_max - entry.kt_min) / (natural.h - 1) / 2 : 0;
    if (entry) omegaExtent = { min: entry.kt_min - halfOmega, max: entry.kt_max + halfOmega };
    panels.push({
      id: 'kx',
      k: [],
      kExtent: entry ? { min: entry.kx_min - halfK, max: entry.kx_max + halfK } : { min: 0, max: 1 },
      values: null,
      href: imagePath,
      gravity: entry?.curves.gravity ?? [],
      advected: entry?.curves.turbulence ?? [],
    });
  }

  // The plot takes what the mode switch and the readout strip (above) and the
  // colour bar (in the band below containerHeight) leave. Unlike the STI,
  // a non-uniform fit is fine here: the axes are independent physical
  // quantities (wavenumber vs frequency), so stretching one does not
  // misrepresent the other — and the curves go through the same axes.
  const areaWidth = Math.max(200, containerWidth);
  const plotHeight = Math.max(160, containerHeight - TOP_BAND - STRIP.height - STRIP.gap);
  const panelHeight = plotHeight - MARGIN.top - MARGIN.bottom;
  const gaps = PANEL_GAP * (panels.length - 1);
  const panelWidth = Math.max(
    40,
    Math.min((areaWidth - MARGIN.left - 12 - gaps) / panels.length, panelHeight * MAX_PANEL_ASPECT)
  );
  const plotWidth = MARGIN.left + panels.length * panelWidth + gaps + 12;
  const panelLeft = (index: number) => MARGIN.left + index * (panelWidth + PANEL_GAP);
  const plotBottom = MARGIN.top + panelHeight;
  const panelsWidth = panels.length * panelWidth + gaps;

  const omegaAxis: SpectrumAxis = { ...omegaExtent, start: plotBottom, end: MARGIN.top };
  const kAxisOf = (index: number): SpectrumAxis => ({
    ...panels[index].kExtent,
    start: panelLeft(index),
    end: panelLeft(index) + panelWidth,
  });

  const omegaTicks = getTicks(Math.max(0, omegaExtent.min), omegaExtent.max, 5);

  const handleMove = (event: ReactMouseEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    const index = panels.findIndex((_, i) => x >= panelLeft(i) && x <= panelLeft(i) + panelWidth);
    if (index === -1 || y < MARGIN.top || y > plotBottom) {
      setHover(null);
      return;
    }
    setHover({ panel: index, k: fromPixel(x, kAxisOf(index)), omega: fromPixel(y, omegaAxis) });
  };

  // What the point under the cursor means. The readout snaps to the cell the
  // cursor is in when the values are known, so k, ω and S describe one cell.
  let readout: { axis: 'x' | 'y'; k: number; omega: number; value: number | null } | null = null;
  if (hover) {
    const panel = panels[hover.panel];
    const column = getNearestIndex(panel.k, hover.k);
    const row = frequencies ? getNearestIndex(frequencies, hover.omega) : -1;
    const snapped = panel.values !== null && frequencies !== null && column !== -1 && row !== -1;
    readout = {
      axis: panel.id === 'kx' ? 'x' : 'y',
      k: snapped ? panel.k[column] : hover.k,
      omega: snapped ? frequencies[row] : hover.omega,
      value: snapped ? panel.values![row][column] : null,
    };
  }
  const point = readout ? describeSpectrumPoint(readout.k, readout.omega) : null;
  const lengthFactor = isImperial ? UNIT_CONVERSIONS.M_TO_FT : 1;
  const lengthUnit = isImperial ? 'ft' : 'm';
  const velocityUnit = isImperial ? UNITS.IMPERIAL.VELOCITY : UNITS.SI.VELOCITY;
  const kUnit = t('Processing.spectrumUnitWavenumber');
  const omegaUnit = t('Processing.spectrumUnitFrequency');

  const energyShare = (share: number | null | undefined) =>
    share === null || share === undefined ? '' : `${Math.round(share * 100)} %`;
  const curves = [
    {
      id: 'gravity',
      label: t('Processing.spectrumGravity'),
      share: energyShare(entry?.energy?.waves),
      shown: showGravity,
      toggle: () => setShowGravity((v) => !v),
      dashed: false,
    },
    {
      id: 'advected',
      label: t('Processing.spectrumAdvected'),
      share: energyShare(entry?.energy?.advected),
      shown: showAdvected,
      toggle: () => setShowAdvected((v) => !v),
      dashed: true,
    },
  ];

  const applyMax = () => {
    const parsed = parseFloat(maxInput);
    if (Number.isFinite(parsed) && parsed > 0) setManualMax(parsed);
    else setMaxInput(clipMax > 0 ? clipMax.toFixed(2) : '');
  };

  // Where the crosshair sits in the plot's own pixels, for the tip beside it.
  const tipX = hover ? toPixel(hover.k, kAxisOf(hover.panel)) : 0;
  const tipY = hover ? toPixel(hover.omega, omegaAxis) : 0;

  const filterId = `spectrum-ramp-${stationId}`;
  const channel = (c: number) => ramp.map((stop) => String(stop[c] / 255)).join(' ');
  const dash = '—';

  return (
    <div className="spectrum-viewer" style={{ paddingTop: TOP_BAND, width: containerWidth }}>
      <div className="spectrum-stage" style={{ width: plotWidth }}>
        {/* The station's readout, one line resting on the panels and exactly
            as wide as them: what the station gave, then the two fitted curves,
            each a switch that hides it to look at the ridge under it. */}
        <div
          className="readout-strip"
          style={{ width: panelsWidth, marginLeft: MARGIN.left, marginBottom: STRIP.gap - MARGIN.top }}
        >
          <b className="readout-strip-title">
            {t('Processing.stiStation')} {stationId}
          </b>
          <span className="readout-strip-item">
            <span>{t('Graphs.velocity')}</span>
            <b>{velocity === null ? dash : `${(velocity * lengthFactor).toFixed(2)} ${velocityUnit}`}</b>
          </span>
          <span className="readout-strip-item">
            <span>{t('Processing.spectrumQuality')}</span>
            <b>{quality === null ? dash : quality.toFixed(2)}</b>
          </span>
          {!hasValues && (
            <span className="readout-strip-note" title={t('Processing.spectrumRerunHint')}>
              {t('Processing.spectrumRerunHint')}
            </span>
          )}
          {entry && (
            <span className="readout-strip-curves">
              {curves.map((curve) => (
                <button
                  key={curve.id}
                  type="button"
                  className="spectrum-curve-toggle"
                  aria-pressed={curve.shown}
                  title={curve.share ? `${curve.label} · ${t('Processing.spectrumEnergyHint')}` : curve.label}
                  onClick={curve.toggle}
                >
                  <svg width="20" height="8" aria-hidden="true">
                    <line
                      x1="1"
                      y1="4"
                      x2="19"
                      y2="4"
                      className="spectrum-curve"
                      strokeDasharray={curve.dashed ? '6 4' : undefined}
                    />
                  </svg>
                  <span>{curve.label}</span>
                  {curve.share && <b>{curve.share}</b>}
                </button>
              ))}
            </span>
          )}
        </div>
        <svg
          className="spectrum-plot"
          width={plotWidth}
          height={plotHeight}
          role="img"
          aria-label={`${t('Processing.previewSpectrum')} · ${t('Processing.stiStation')} ${stationId}`}
          onMouseMove={handleMove}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            {/* The PNG is grey, darkest where there is no energy: lift it,
                then run it through the theme's ramp. */}
            <filter id={filterId} colorInterpolationFilters="sRGB">
              <feComponentTransfer>
                <feFuncR type="linear" slope={LEGACY_IMAGE_GAIN} />
                <feFuncG type="linear" slope={LEGACY_IMAGE_GAIN} />
                <feFuncB type="linear" slope={LEGACY_IMAGE_GAIN} />
              </feComponentTransfer>
              <feComponentTransfer>
                <feFuncR type="table" tableValues={channel(0)} />
                <feFuncG type="table" tableValues={channel(1)} />
                <feFuncB type="table" tableValues={channel(2)} />
              </feComponentTransfer>
            </filter>
            {panels.map((panel, i) => (
              <clipPath key={panel.id} id={`${filterId}-clip-${panel.id}`}>
                <rect x={panelLeft(i)} y={MARGIN.top} width={panelWidth} height={panelHeight} rx={4} />
              </clipPath>
            ))}
          </defs>

          {omegaTicks.map((tick) => (
            <text
              key={tick}
              className="spectrum-tick"
              x={MARGIN.left - 10}
              y={toPixel(tick, omegaAxis)}
              textAnchor="end"
              dominantBaseline="middle"
            >
              {formatTick(tick)}
            </text>
          ))}
          <text
            className="spectrum-axis-title"
            transform={`translate(20 ${MARGIN.top + panelHeight / 2}) rotate(-90)`}
            textAnchor="middle"
          >
            <tspan className="spectrum-axis-symbol">ω</tspan>
            <tspan className="spectrum-axis-unit" dx="10">
              {omegaUnit}
            </tspan>
          </text>

          {panels.map((panel, i) => {
            const kAxis = kAxisOf(i);
            const kTicks = getTicks(panel.kExtent.min, panel.kExtent.max, panelWidth > 300 ? 6 : 4);
            const clip = `url(#${filterId}-clip-${panel.id})`;
            return (
              <g key={panel.id}>
                <g clipPath={clip}>
                  <rect
                    className="spectrum-ground"
                    x={panelLeft(i)}
                    y={MARGIN.top}
                    width={panelWidth}
                    height={panelHeight}
                  />
                  <image
                    className="iwave-spectrum-image"
                    href={panel.href}
                    x={panelLeft(i)}
                    y={MARGIN.top}
                    width={panelWidth}
                    height={panelHeight}
                    preserveAspectRatio="none"
                    filter={panel.values === null ? `url(#${filterId})` : undefined}
                  />
                  {omegaTicks.map((tick) => (
                    <line
                      key={tick}
                      className="spectrum-grid"
                      x1={panelLeft(i)}
                      x2={panelLeft(i) + panelWidth}
                      y1={toPixel(tick, omegaAxis)}
                      y2={toPixel(tick, omegaAxis)}
                    />
                  ))}
                  {panel.kExtent.min < 0 && panel.kExtent.max > 0 && (
                    <line
                      className="spectrum-grid"
                      x1={toPixel(0, kAxis)}
                      x2={toPixel(0, kAxis)}
                      y1={MARGIN.top}
                      y2={plotBottom}
                    />
                  )}
                  {showAdvected && panel.advected.length > 1 && (
                    <>
                      <path className="spectrum-curve-casing" d={curveToPath(panel.advected, kAxis, omegaAxis)} />
                      <path
                        className="spectrum-curve"
                        strokeDasharray="6 4"
                        d={curveToPath(panel.advected, kAxis, omegaAxis)}
                      />
                    </>
                  )}
                  {showGravity && panel.gravity.length > 1 && (
                    <>
                      <path className="spectrum-curve-casing" d={curveToPath(panel.gravity, kAxis, omegaAxis)} />
                      <path className="spectrum-curve" d={curveToPath(panel.gravity, kAxis, omegaAxis)} />
                    </>
                  )}
                </g>
                <rect
                  className="spectrum-frame"
                  x={panelLeft(i)}
                  y={MARGIN.top}
                  width={panelWidth}
                  height={panelHeight}
                  rx={4}
                />
                {kTicks.map((tick) => (
                  <text
                    key={tick}
                    className="spectrum-tick"
                    x={toPixel(tick, kAxis)}
                    y={plotBottom + 20}
                    textAnchor="middle"
                  >
                    {formatTick(tick)}
                  </text>
                ))}
                <text
                  className="spectrum-axis-title"
                  x={panelLeft(i) + panelWidth / 2}
                  y={plotBottom + 50}
                  textAnchor="middle"
                >
                  <tspan className="spectrum-axis-symbol">k</tspan>
                  <tspan className="spectrum-axis-sub" dy="5">
                    {panel.id === 'kx' ? 'x' : 'y'}
                  </tspan>
                  <tspan className="spectrum-axis-unit" dx="10" dy="-5">
                    {kUnit}
                  </tspan>
                </text>
              </g>
            );
          })}

          {hover && (
            <g className="spectrum-crosshair">
              <line
                x1={panelLeft(0)}
                x2={panelLeft(panels.length - 1) + panelWidth}
                y1={toPixel(hover.omega, omegaAxis)}
                y2={toPixel(hover.omega, omegaAxis)}
              />
              <line
                x1={toPixel(hover.k, kAxisOf(hover.panel))}
                x2={toPixel(hover.k, kAxisOf(hover.panel))}
                y1={MARGIN.top}
                y2={plotBottom}
              />
            </g>
          )}
        </svg>

        {/* The point under the cursor, read beside the crosshair that marks
            it. It flips to the other side of the cursor near the right and
            bottom edges, so it never leaves the plot. */}
        {hover && readout && (
          <div
            className="point-tip spectrum-tip"
            style={{
              ...(tipX + TIP.offset + TIP.width > plotWidth
                ? { right: plotWidth - tipX + TIP.offset }
                : { left: tipX + TIP.offset }),
              ...(tipY + TIP.offset + TIP.height > plotBottom
                ? { bottom: plotHeight - tipY + TIP.offset }
                : { top: STRIP.height + STRIP.gap - MARGIN.top + tipY + TIP.offset }),
            }}
          >
            <span>
              <span>
                <i>k</i>
                <sub>{readout.axis}</sub>
              </span>
            </span>
            <b>{`${withMinus(readout.k.toFixed(2))} ${kUnit}`}</b>
            <span>
              <i>ω</i>
            </span>
            <b>{`${readout.omega.toFixed(2)} ${omegaUnit}`}</b>
            <span title={t('Processing.spectrumWavelength')}>
              <i>λ</i>
            </span>
            <b>
              {point && point.wavelength !== null
                ? `${(point.wavelength * lengthFactor).toFixed(2)} ${lengthUnit}`
                : dash}
            </b>
            <span title={t('Processing.spectrumPhaseSpeed')}>
              <i>ω/k</i>
            </span>
            <b>
              {point && point.phaseSpeed !== null
                ? `${withMinus((point.phaseSpeed * lengthFactor).toFixed(2))} ${velocityUnit}`
                : dash}
            </b>
            {readout.value !== null && (
              <>
                <span>
                  <i>S</i>
                </span>
                <b>{readout.value.toFixed(2)}</b>
              </>
            )}
          </div>
        )}
      </div>

      {/* The same colour bar as the Frames and Space-time views, on the
          spectrum's ramp: it starts at zero, and its upper field is the value
          the ramp saturates at. */}
      {hasValues && clipMax > 0 && (
        <div className="colorbar-container" style={{ width: containerWidth * 0.35 }}>
          <span className="colorbar-input spectrum-colorbar-zero">0</span>
          <div
            className="colorbar spectrum-colorbar"
            onMouseMove={(event) => {
              const bounds = event.currentTarget.getBoundingClientRect();
              setBarHover(Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)));
            }}
            onMouseLeave={() => setBarHover(null)}
          >
            {barHover !== null && (
              <div className="colorbar-marker" style={{ left: `${barHover * 100}%` }}>
                <span>{(barHover * clipMax).toFixed(2)}</span>
              </div>
            )}
          </div>
          <input
            value={maxInput}
            className="colorbar-input"
            type="number"
            aria-label={`S max`}
            onChange={(event) => setMaxInput(event.currentTarget.value)}
            onKeyDown={(event) => event.key === 'Enter' && applyMax()}
            onBlur={applyMax}
          />
          <span className="colorbar-unit-label">S</span>
          {manualMax !== null && (
            <span className="colorbar-manual-badge">
              {t('Processing.colorbarManual', { defaultValue: 'Manual' })}
            </span>
          )}
          <button
            onClick={() => setManualMax(null)}
            disabled={manualMax === null}
            title={t('Processing.colorbarReset', { defaultValue: 'Reset to data range' })}
          >
            {Icons.Undo('currentColor')}
          </button>
        </div>
      )}
    </div>
  );
};
