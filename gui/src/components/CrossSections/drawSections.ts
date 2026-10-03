import { BankLabels, resolvePinLabel } from '../../helpers/pinLabel';
import * as d3 from 'd3';
import { COLORS } from '../../constants/constants';
import { drawPin, PinKind, updatePinLean } from '../Graphs/drawPin';
import { showMagnifier, hideMagnifier } from '../Graphs/drawMagnifier';
import { drawOverlayLine, OVERLAY_STYLE, type OverlaySize } from '../Graphs/overlayStyle';
import { visibleImageBounds, type Bounds } from '../Graphs/pinLean';

type Point = { x: number; y: number };

interface DrawSvgStaticSectionProps {
  bankLabels?: BankLabels;
  zoomLayer: d3.Selection<SVGGElement, unknown, null, undefined>;
  uiLayer: d3.Selection<SVGGElement, unknown, null, undefined>;
  factor: number | { x: number; y: number };
  dirPoints: Point[];
  sectionPoints: Point[];
  name: string;
  /** User-facing label drawn on the canvas ("Section N"). `name` stays the
   *  internal identifier, used only for the per-section CSS class token. */
  label: string;
  imageWidth: number;
  imageHeight: number;
  module: 'x-sections' | 'processing' | 'results' | 'report' | string;
  scale: number;
  position: { x: number; y: number };
  seeAll: boolean;
  isActive?: boolean;
  /** When true, skip drawing lines and pins (interactive effect handles them)
   *  but still render the section label. Used for the active section in x-sections. */
  skipLine?: boolean;
}

export const getResizedPoint = (point: Point, factor: number | { x: number; y: number }) => {
  return {
    x: point.x / (typeof factor === 'number' ? factor : factor.x),
    y: point.y / (typeof factor === 'number' ? factor : factor.y),
  };
};

const toSectionToken = (name: string) => {
  return (name || 'unnamed')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '');
};

/**
 * Normalize a factor that may be scalar or {x,y} into separate fx/fy.
 */
const normalizeFactor = (factor: number | { x: number; y: number }) => {
  return {
    fx: typeof factor === 'number' ? factor : factor.x,
    fy: typeof factor === 'number' ? factor : factor.y,
  };
};

/**
 * Colour and size by module. Widths live in overlayStyle.ts; only the report
 * draws at report size.
 */
const getSectionStyles = (module: string) => {
  let lineColor = COLORS.BLACK;
  let textColor = COLORS.BLACK;

  switch (module) {
    case 'uav':
      lineColor = COLORS.LIGHT_BLUE;
      textColor = COLORS.MARK_R;
      break;
    case 'x-sections':
    case 'results':
    case 'report':
      lineColor = COLORS.YELLOW;
      textColor = COLORS.YELLOW;
      break;
    case 'processing':
      lineColor = COLORS.DARK_GREY;
      textColor = COLORS.BLACK;
      break;
    default:
      break;
  }

  const size: OverlaySize = module === 'report' ? 'report' : 'app';
  return { size, lineColor, textColor };
};

/**
 * A section line in "image space" divided by fx/fy (pass 1/1 for points
 * already in zoom space). The dashed transect gets end ticks so it reads as a
 * measurement line; the solid direction line does not. Widths stay in screen
 * pixels inside the zoom layer (non-scaling stroke), as before.
 */
const drawLine = ({
  points,
  group,
  color,
  size,
  fx,
  fy,
  dashed = false,
  className,
}: {
  points: [Point, Point];
  group: d3.Selection<SVGGElement, unknown, null, undefined>;
  color: string;
  size: OverlaySize;
  fx: number;
  fy: number;
  dashed?: boolean;
  className: string;
}) =>
  drawOverlayLine({
    layer: group,
    from: { x: points[0].x / fx, y: points[0].y / fy },
    to: { x: points[1].x / fx, y: points[1].y / fy },
    color,
    size,
    dashed,
    ticks: dashed,
    className,
    nonScaling: true,
  });

/**
 * Draw one crosshair pin (L or R for cross-sections, 1/2 for UAV pixel
 * size) via the shared drawPin module. `draggable` only affects
 * pointer-events/cursor — the caller decides whether to attach d3.drag().
 */
const drawIcon = (
  position: Point,
  type: 'L' | 'R',
  layer: d3.Selection<SVGGElement, unknown, null, undefined>,
  draggable: boolean,
  extraClass: string = '',
  module: string,
  bankLabels?: BankLabels,
  size: OverlaySize = 'app',
  bounds?: Bounds
) => {
  const isLeft = type === 'L';
  const kind: PinKind = module === 'uav' ? 'point' : isLeft ? 'left' : 'right';
  const label = resolvePinLabel(module, type, bankLabels);

  const g = drawPin({
    layer,
    tip: position,
    kind,
    label,
    divisor: OVERLAY_STYLE[size].PIN_DIVISOR,
    bounds,
    className: `pin-${draggable ? 'draggable' : 'static'} pin-${type} ${extraClass}`.trim(),
  });
  g.attr('cursor', draggable ? 'move' : 'default').attr('pointer-events', draggable ? 'all' : 'none');

  return g;
};

/**
 * Convert from image space to screen space (UI layer).
 * p=(x,y) is normalized by (fx,fy) to overlay-zoom, then projected with viewport.
 */
const toScreenFactory = ({
  imageWidth,
  imageHeight,
  position,
  scale,
  fx,
  fy,
}: {
  imageWidth: number;
  imageHeight: number;
  position: { x: number; y: number };
  scale: number;
  fx: number;
  fy: number;
}) => {
  const cx = imageWidth / 2;
  const cy = imageHeight / 2;
  return (p: Point) => {
    const px = p.x / fx;
    const py = p.y / fy;
    return {
      x: position.x + cx + (px - cx) * scale,
      y: position.y + cy + (py - cy) * scale,
    };
  };
};

/**
 * Badge-style label for a cross-section.
 *
 * Positioning rules:
 *  - Anchored at the **midpoint** of the section line (sectionPoints), so the
 *    label is always centred over the cross-section regardless of line length.
 *  - Offset **perpendicular** to the section line (i.e. in the flow direction)
 *    so it never sits on top of the dashed line.  Of the two perpendicular
 *    directions, we pick the one whose candidate position is closer to the
 *    image centre — this keeps the label within the image bounds in the vast
 *    majority of layouts.  The result is clamped to safe margins as a final
 *    safety net.
 *  - Rotation is **normalised to [-90°, 90°]** so the text is always legible
 *    and never rendered upside-down, regardless of the line orientation.
 *
 * Visual style: rounded-rect badge with the same dark semi-transparent fill
 * and font weight used by the L / R pin-badge labels.
 */
const drawSectionLabel = ({
  uiLayer,
  text,
  points,
  viewport,
  factor,
  color,
  className,
}: {
  uiLayer: d3.Selection<SVGGElement, unknown, null, undefined>;
  text: string;
  /** The two endpoints of the cross-section line (sectionPoints) in full-image space */
  points: [Point, Point];
  viewport: {
    imageWidth: number;
    imageHeight: number;
    position: { x: number; y: number };
    scale: number;
  };
  factor: number | { x: number; y: number };
  color: string;
  className: string;
}) => {
  const { fx, fy } = normalizeFactor(factor);

  const toScreen = toScreenFactory({
    imageWidth: viewport.imageWidth,
    imageHeight: viewport.imageHeight,
    position: viewport.position,
    scale: viewport.scale,
    fx,
    fy,
  });

  // --- Geometry (all in display space) ---
  const p0d = { x: points[0].x / fx, y: points[0].y / fy };
  const p1d = { x: points[1].x / fx, y: points[1].y / fy };

  // Midpoint of the section line → natural centre for the label
  const midD = { x: (p0d.x + p1d.x) / 2, y: (p0d.y + p1d.y) / 2 };

  // Direction vector of the section line
  const dxD = p1d.x - p0d.x;
  const dyD = p1d.y - p0d.y;

  // Rotation angle, normalised to [-90, 90] so text is never upside-down
  let rotation = Math.atan2(dyD, dxD) * (180 / Math.PI);
  if (rotation > 90) rotation -= 180;
  if (rotation < -90) rotation += 180;

  // Unit vector perpendicular to the section line (= flow direction)
  const lineLen = Math.sqrt(dxD * dxD + dyD * dyD);
  const perpX = lineLen > 0 ? -dyD / lineLen : 0;
  const perpY = lineLen > 0 ? dxD / lineLen : 1;

  // Candidate label positions on either side of the section line
  const LABEL_OFFSET = 20; // display-space pixels — close to but not touching the 4 px stroke
  const imageCx = viewport.imageWidth / 2;
  const imageCy = viewport.imageHeight / 2;

  const c1 = { x: midD.x + perpX * LABEL_OFFSET, y: midD.y + perpY * LABEL_OFFSET };
  const c2 = { x: midD.x - perpX * LABEL_OFFSET, y: midD.y - perpY * LABEL_OFFSET };

  // Prefer the candidate closer to the image centre (stays within bounds more often)
  const d1sq = (c1.x - imageCx) ** 2 + (c1.y - imageCy) ** 2;
  const d2sq = (c2.x - imageCx) ** 2 + (c2.y - imageCy) ** 2;
  let labelD = d1sq <= d2sq ? { ...c1 } : { ...c2 };

  // Clamp to safe margins
  const MX = 50,
    MY = 16;
  labelD.x = Math.max(MX, Math.min(viewport.imageWidth - MX, labelD.x));
  labelD.y = Math.max(MY, Math.min(viewport.imageHeight - MY, labelD.y));

  // Back to full-image space → screen coords
  const screenPoint = toScreen({ x: labelD.x * fx, y: labelD.y * fy });

  // --- Badge rendering — same style as the L / R pin badges ---
  const FONT_SIZE = 13;

  const g = uiLayer.append('g').attr('class', className).attr('pointer-events', 'none');

  const textEl = g
    .append('text')
    .attr('x', screenPoint.x)
    .attr('y', screenPoint.y)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')
    .text(text)
    .attr('font-size', FONT_SIZE)
    .attr('font-weight', '600')
    .attr('fill', color)
    .attr('font-family', 'inherit');

  // Measure the rendered text and insert the background rect behind it
  try {
    const node = textEl.node() as SVGTextElement;
    const bbox = node.getBBox();
    const padX = 6,
      padY = 3;
    g.insert('rect', 'text')
      .attr('x', bbox.x - padX)
      .attr('y', bbox.y - padY)
      .attr('width', bbox.width + padX * 2)
      .attr('height', bbox.height + padY * 2)
      .attr('rx', 3)
      .attr('ry', 3)
      .attr('fill', 'rgba(50, 50, 50, 0.85)'); // matches pin-badge fill
  } catch {
    // getBBox may fail if not yet attached to the DOM — silently skip
  }

  // Rotate the whole badge after the bbox has been captured
  g.attr('transform', `rotate(${rotation}, ${screenPoint.x}, ${screenPoint.y})`);
};

/**
 * Draw a single section in the static pass (non-interactive).
 * - Lines go in zoomLayer (follow image pan/zoom) for x-sections and processing.
 * - Text/icons go in uiLayer (constant screen size).
 */
const drawStaticSection = ({
  bankLabels,
  zoomLayer,
  uiLayer,
  factor,
  dirPoints,
  sectionPoints,
  name,
  label,
  imageWidth,
  imageHeight,
  module,
  scale,
  position,
  seeAll,
  isActive = true,
  skipLine = false,
}: DrawSvgStaticSectionProps) => {
  const { fx, fy } = normalizeFactor(factor);
  const { size, lineColor, textColor } = getSectionStyles(module);

  const token = toSectionToken(name);
  const sectionClass = `section-${token}`;
  // The interactive effect owns the draggable pins; a static redraw must not wipe them.
  const interactiveUiClass = `interactive-ui-${token}`;

  const isXSections = module === 'x-sections';
  const isProcessing = module === 'processing';
  const useZoomLayer = isXSections || isProcessing;

  if (seeAll === false && module === 'x-sections') {
    zoomLayer.selectAll(`.${sectionClass}`).remove();
    uiLayer.selectAll(`.${sectionClass}:not(.${interactiveUiClass})`).remove();
    return;
  }

  if (seeAll === false && !isActive && module === 'results') {
    zoomLayer.selectAll(`.${sectionClass}`).remove();
    uiLayer.selectAll(`.${sectionClass}:not(.${interactiveUiClass})`).remove();
    return;
  }

  // Clean only this section to avoid duplicates
  zoomLayer.selectAll(`.${sectionClass}`).remove();
  uiLayer.selectAll(`.${sectionClass}:not(.${interactiveUiClass})`).remove();

  // Group inside zoom layer for this section
  const g = zoomLayer.append('g').attr('class', `section-layer ${sectionClass}`);

  // Determine whether dirPoints and sectionPoints carry real data
  const hasMeaningfulDirPoints =
    dirPoints.length >= 2 && !(dirPoints[0].x === dirPoints[1].x && dirPoints[0].y === dirPoints[1].y);

  const hasMeaningfulSectionPoints =
    sectionPoints.length >= 2 &&
    !(sectionPoints[0].x === sectionPoints[1].x && sectionPoints[0].y === sectionPoints[1].y);

  if (!skipLine) {
    // Section line (dashed) — drawn first so the solid direction line paints
    // on top of it where the two overlap.
    if (hasMeaningfulSectionPoints) {
      drawLine({
        points: [sectionPoints[0], sectionPoints[1]],
        group: useZoomLayer ? g : uiLayer,
        color: lineColor,
        size,
        fx,
        fy,
        dashed: true,
        className: `static-section-line ${sectionClass}`,
      });
    }

    // Direction line (solid)
    if (hasMeaningfulDirPoints) {
      drawLine({
        points: [dirPoints[0], dirPoints[1]],
        group: useZoomLayer ? g : uiLayer,
        color: lineColor,
        size,
        fx,
        fy,
        dashed: false,
        className: `static-dir-line ${sectionClass}`,
      });
    }
  }

  // Label in UI (screen space) — always drawn, even for the active section (skipLine).
  // Only skip for the report module and when sectionPoints have not yet been computed.
  if (module !== 'report' && hasMeaningfulSectionPoints) {
    drawSectionLabel({
      uiLayer,
      text: label,
      points: [sectionPoints[0], sectionPoints[1]],
      viewport: { imageWidth, imageHeight, position, scale },
      factor,
      color: textColor,
      className: `static-section-label ${sectionClass}`,
    });
  }

  // Bank pins in UI (screen space). Results shows them on the active section
  // only (several sections can be drawn at once); the report's frame shows
  // one section, so it always gets them.
  const showBankPins = module === 'x-sections' || module === 'report' || (module === 'results' && isActive);
  if (!skipLine && showBankPins && hasMeaningfulDirPoints) {
    const toScreen = toScreenFactory({ imageWidth, imageHeight, position, scale, fx, fy });
    const p0 = toScreen(dirPoints[0]);
    const p1 = toScreen(dirPoints[1]);
    const bounds = visibleImageBounds({ width: imageWidth, height: imageHeight, position, scale }, 'screen');

    drawIcon(p0, 'L', uiLayer, false, sectionClass, module, bankLabels, size, bounds);
    drawIcon(p1, 'R', uiLayer, false, sectionClass, module, bankLabels, size, bounds);
  }
};

// ---- Interactive (x-sections) ----

const toScreenFromZoomFactory = ({
  imageWidth,
  imageHeight,
  position,
  scale,
}: {
  imageWidth: number;
  imageHeight: number;
  position: { x: number; y: number };
  scale: number;
}) => {
  const cx = imageWidth / 2;
  const cy = imageHeight / 2;
  return (p: Point) => ({
    x: position.x + cx + (p.x - cx) * scale,
    y: position.y + cy + (p.y - cy) * scale,
  });
};

interface DrawSvgInteractiveSectionProps {
  bankLabels?: BankLabels;
  layer: d3.Selection<SVGGElement, unknown, null, undefined>;
  uiLayer: d3.Selection<SVGGElement, unknown, null, undefined>;
  zoomLayerNode: SVGGElement;
  startPoint: Point | null;
  endPoint: Point | null;
  sectionPoints?: Point[];
  name?: string;
  setMousePressed: (pressed: boolean) => void;
  setStartPoint: (point: Point) => void;
  setEndPoint: (point: Point) => void;
  onSetDirPoints: (data: { points: Point[]; factor: number; index: number; mode?: string }, arg2: any) => void;
  factor: number | { x: number; y: number };
  mousePressed: boolean;
  viewport: {
    imageWidth: number;
    imageHeight: number;
    position: { x: number; y: number };
    scale: number;
  };
  module: string;
  imageSrc: string;
}

const drawInteractiveSection = ({
  bankLabels,
  layer,
  uiLayer,
  zoomLayerNode,
  startPoint,
  endPoint,
  sectionPoints,
  name,
  setMousePressed,
  setStartPoint,
  setEndPoint,
  onSetDirPoints,
  factor,
  mousePressed,
  viewport,
  module,
  imageSrc,
}: DrawSvgInteractiveSectionProps) => {
  const { size, lineColor } = getSectionStyles(module);

  const token = toSectionToken(name ? name : 'uav');
  const sectionClass = `section-${token}`;

  // Interactive-layer elements use a dedicated UI class so that cleaning them
  // does not accidentally remove the static label drawn by the static effect.
  const interactiveUiClass = `interactive-ui-${token}`;

  // Clean only interactive-layer elements (zoom layer) and interactive UI overlays
  layer.selectAll(`.${sectionClass}`).remove();
  uiLayer.selectAll(`.${interactiveUiClass}`).remove();

  // Section dashed line when not dragging — drawn first so the solid direction
  // line paints on top of it where the two overlap. Label is owned by the
  // static effect.
  if (sectionPoints !== undefined && sectionPoints.length > 0 && !mousePressed) {
    drawLine({
      points: [sectionPoints[0], sectionPoints[1]],
      group: layer,
      color: lineColor,
      size,
      fx: typeof factor === 'number' ? factor : factor.x,
      fy: typeof factor === 'number' ? factor : factor.y,
      dashed: true,
      className: `final-section-line ${sectionClass}`,
    });
  }

  // Interactive direction line (zoom-space, drawn while dragging or after drop)
  if (startPoint && endPoint) {
    drawLine({
      points: [startPoint, endPoint],
      group: layer,
      color: lineColor,
      size,
      fx: 1,
      fy: 1,
      dashed: false,
      className: `final-line ${sectionClass}`,
    });
  }

  // Proyección de zoom-space -> screen-space para los íconos
  const toScreenFromZoom = toScreenFromZoomFactory({
    imageWidth: viewport.imageWidth,
    imageHeight: viewport.imageHeight,
    position: viewport.position,
    scale: viewport.scale,
  });
  const bounds = visibleImageBounds(
    { width: viewport.imageWidth, height: viewport.imageHeight, position: viewport.position, scale: viewport.scale },
    'screen'
  );

  // The screen position each pin was actually drawn at, captured once per
  // render — the fixed point every 'drag' tick's transform is relative to.
  const startScreenAtDraw = startPoint ? toScreenFromZoom(startPoint) : null;

  const dragStartPoint = d3
    .drag<SVGGElement, unknown, { x: number; y: number }>()
    .container(() => zoomLayerNode) // coordenadas del puntero en zoom-space
    .on('start', () => setMousePressed(true))
    .on('drag', function (event) {
      const x = event.x;
      const y = event.y;

      // Actualiza el modelo en zoom-space
      setStartPoint({ x, y });

      // Mueve el pin en screen-space inmediatamente (sin recrearlo — ver nota
      // arriba), y actualiza el magnifier.
      const pScreen = toScreenFromZoom({ x, y });
      if (startScreenAtDraw) {
        d3.select<SVGGElement, unknown>(this).attr(
          'transform',
          `translate(${pScreen.x - startScreenAtDraw.x}, ${pScreen.y - startScreenAtDraw.y})`
        );
        updatePinLean(d3.select<SVGGElement, unknown>(this), pScreen, OVERLAY_STYLE[size].PIN_DIVISOR, bounds);
      }
      showMagnifier({
        layer: uiLayer,
        point: pScreen,
        imagePoint: { x, y },
        imageSrc,
        imageWidth: viewport.imageWidth,
        imageHeight: viewport.imageHeight,
        coordinateFactor: typeof factor === 'number' ? factor : factor.x,
      });
    })
    .on('end', function (event) {
      setMousePressed(false);
      hideMagnifier(uiLayer);
      if (endPoint) {
        const x = event.x;
        const y = event.y;
        onSetDirPoints({ points: [{ x, y }, endPoint], factor: factor as number, index: 0 }, null);
      }
    });

  if (startPoint) {
    dragStartPoint.subject(() => ({ x: startPoint.x, y: startPoint.y }));
  }

  // Drag para endPoint: igual patrón subject + container(zoomLayerNode)
  const endScreenAtDraw = endPoint ? toScreenFromZoom(endPoint) : null;

  const dragEndPoint = d3
    .drag<SVGGElement, unknown, { x: number; y: number }>()
    .container(() => zoomLayerNode)
    .subject(() => {
      if (endPoint) {
        return { x: endPoint.x, y: endPoint.y };
      } else {
        return { x: 0, y: 0 };
      }
    })
    .on('start', () => setMousePressed(true))
    .on('drag', function (event) {
      const x = event.x;
      const y = event.y;

      setEndPoint({ x, y });

      const pScreen = toScreenFromZoom({ x, y });
      if (endScreenAtDraw) {
        d3.select<SVGGElement, unknown>(this).attr(
          'transform',
          `translate(${pScreen.x - endScreenAtDraw.x}, ${pScreen.y - endScreenAtDraw.y})`
        );
        updatePinLean(d3.select<SVGGElement, unknown>(this), pScreen, OVERLAY_STYLE[size].PIN_DIVISOR, bounds);
      }
      showMagnifier({
        layer: uiLayer,
        point: pScreen,
        imagePoint: { x, y },
        imageSrc,
        imageWidth: viewport.imageWidth,
        imageHeight: viewport.imageHeight,
        coordinateFactor: typeof factor === 'number' ? factor : factor.x,
      });
    })
    .on('end', function (event) {
      setMousePressed(false);
      hideMagnifier(uiLayer);
      if (startPoint) {
        const x = event.x;
        const y = event.y;
        onSetDirPoints({ points: [startPoint, { x, y }], factor: factor as number, index: 1 }, null);
      }
    });

  // Icons in UI (screen-space) — tagged with interactiveUiClass so they are
  // cleaned up on the next render without touching the static label.
  if (startPoint) {
    const pScreen = toScreenFromZoom(startPoint);
    const c1 = drawIcon(pScreen, 'L', uiLayer, true, `${sectionClass} ${interactiveUiClass}`, module, bankLabels, size, bounds);
    c1.call(dragStartPoint as any);
  }

  if (endPoint) {
    const pScreen = toScreenFromZoom(endPoint);
    const c2 = drawIcon(pScreen, 'R', uiLayer, true, `${sectionClass} ${interactiveUiClass}`, module, bankLabels, size, bounds);
    c2.call(dragEndPoint as any);
  }
};

export { drawStaticSection, drawInteractiveSection };
