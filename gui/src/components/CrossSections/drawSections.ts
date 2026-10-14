import * as d3 from 'd3';
import { t } from 'i18next';
import { COLORS, MARKS } from '../../constants/constants';
import { pinGreen, pinRed, pin } from '../../assets/icons/icons';

type Point = { x: number; y: number };

interface DrawSvgStaticSectionProps {
  zoomLayer: d3.Selection<SVGGElement, unknown, null, undefined>;
  uiLayer: d3.Selection<SVGGElement, unknown, null, undefined>;
  factor: number | { x: number; y: number };
  dirPoints: Point[];
  sectionPoints: Point[];
  name: string;
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
 * Style choices for lines and labels by module.
 */
const getSectionStyles = (module: string) => {
  let resizeFactor = 1;
  let lineColor = COLORS.BLACK;
  let textColor = COLORS.BLACK;

  switch (module) {
    case 'uav':
      resizeFactor = 1;
      lineColor = COLORS.LIGHT_BLUE;
      textColor = COLORS.MARK_R;
      break;

    case 'x-sections':
      resizeFactor = 1;
      lineColor = COLORS.YELLOW;
      textColor = COLORS.YELLOW;
      break;

    case 'processing':
      resizeFactor = 1;
      lineColor = COLORS.DARK_GREY;
      textColor = COLORS.BLACK;
      break;

    case 'results':
      resizeFactor = 1;
      lineColor = COLORS.YELLOW;
      textColor = COLORS.YELLOW;
      break;

    case 'report':
      resizeFactor = 1.2;
      lineColor = COLORS.YELLOW;
      textColor = COLORS.YELLOW;
      break;

    default:
      break;
  }

  return {
    resizeFactor,
    lineColor,
    textColor,
  };
};

/**
 * Append a line with standard attributes and optional dash.
 * Points are in "image space" unless fx/fy=1 (zoom space).
 *
 * Draws a dark contrast halo behind the colored line so it stays legible
 * over any video footage (a flat single-width stroke can wash out over
 * light or busy backgrounds), and — for the dashed section line — small
 * perpendicular ticks at both ends so it reads as a measurement transect
 * rather than an arbitrary segment.
 */
const drawLine = ({
  points,
  group,
  color,
  resizeFactor,
  fx,
  fy,
  dashed = false,
  className,
}: {
  points: [Point, Point];
  group: d3.Selection<SVGGElement, unknown, null, undefined>;
  color: string;
  resizeFactor: number;
  fx: number;
  fy: number;
  dashed?: boolean;
  className: string;
}) => {
  const x1 = points[0].x / fx;
  const y1 = points[0].y / fy;
  const x2 = points[1].x / fx;
  const y2 = points[1].y / fy;
  const strokeWidth = 4 / resizeFactor;

  group
    .append('line')
    .attr('class', `${className}-halo`)
    .attr('x1', x1)
    .attr('y1', y1)
    .attr('x2', x2)
    .attr('y2', y2)
    .attr('stroke', 'rgba(0, 0, 0, 0.45)')
    .attr('stroke-width', strokeWidth + 3)
    .attr('stroke-linecap', 'round')
    .attr('vector-effect', 'non-scaling-stroke')
    .attr('stroke-dasharray', dashed ? '5,10' : null);

  group
    .append('line')
    .attr('class', className)
    .attr('x1', x1)
    .attr('y1', y1)
    .attr('x2', x2)
    .attr('y2', y2)
    .attr('stroke', color)
    .attr('stroke-width', strokeWidth)
    .attr('stroke-linecap', 'round')
    .attr('vector-effect', 'non-scaling-stroke')
    .attr('stroke-dasharray', dashed ? '5,10' : null);

  if (dashed) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const perpX = -dy / len;
    const perpY = dx / len;
    const tickLen = 10 / resizeFactor;

    [
      [x1, y1],
      [x2, y2],
    ].forEach(([tx, ty]) => {
      group
        .append('line')
        .attr('class', `${className}-tick`)
        .attr('x1', tx - perpX * tickLen)
        .attr('y1', ty - perpY * tickLen)
        .attr('x2', tx + perpX * tickLen)
        .attr('y2', ty + perpY * tickLen)
        .attr('stroke', color)
        .attr('stroke-width', 2 / resizeFactor)
        .attr('stroke-linecap', 'round')
        .attr('vector-effect', 'non-scaling-stroke');
    });
  }
};

/**
 * Draw a pin icon (L or R) plus its tiny label (L/R).
 */
const drawIcon = (
  position: Point,
  type: 'L' | 'R',
  layer: d3.Selection<SVGGElement, unknown, null, undefined>,
  draggable: boolean,
  extraClass: string = '',
  module: string
) => {
  const isLeft = type === 'L';
  const href = module === 'uav' ? pin : isLeft ? pinRed : pinGreen;
  const labelColor = module === 'uav' ? COLORS.LIGHT_BLUE : isLeft ? COLORS.RED : COLORS.GREEN;

  const icon = layer
    .append('image')
    .attr('href', href)
    .attr('width', MARKS.WIDTH + 5)
    .attr('height', MARKS.HEIGHT + 5)
    .attr('x', position.x - MARKS.OFFSET_X)
    .attr('y', position.y - MARKS.OFFSET_Y)
    .attr('cursor', draggable ? 'move' : 'default')
    .attr('pointer-events', draggable ? 'all' : 'none')
    .attr('class', `pin-${draggable ? 'draggable' : 'static'} pin-${type} ${extraClass}`.trim());

  const badgeText =
    module === 'uav'
      ? type === 'L'
        ? '1'
        : '2'
      : type === 'L'
        ? t('CrossSections.bankLeft')
        : t('CrossSections.bankRight');
  const badgeWidth = 20;
  const badgeHeight = 16;
  const badgeX = position.x - badgeWidth / 2;
  const badgeY = position.y - MARKS.OFFSET_Y - 14;

  const badge = layer
    .append('g')
    .attr('class', `pin-label-${draggable ? 'draggable' : 'static'} pin-label-${type} ${extraClass}`.trim())
    .attr('pointer-events', 'none');

  badge
    .append('rect')
    .attr('x', badgeX)
    .attr('y', badgeY)
    .attr('width', badgeWidth)
    .attr('height', badgeHeight)
    .attr('rx', 3)
    .attr('ry', 3)
    .attr('fill', 'rgba(50,50,50,0.85)');

  badge
    .append('text')
    .attr('x', position.x)
    .attr('y', badgeY + badgeHeight / 2)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')
    .text(badgeText)
    .attr('font-size', 11)
    .attr('font-weight', '600')
    .attr('fill', labelColor);

  return icon;
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
  resizeFactor,
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
  resizeFactor: number;
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
  const FONT_SIZE = 13 / resizeFactor;

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
  zoomLayer,
  uiLayer,
  factor,
  dirPoints,
  sectionPoints,
  name,
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
  const { resizeFactor, lineColor, textColor } = getSectionStyles(module);

  const token = toSectionToken(name);
  const sectionClass = `section-${token}`;

  const isXSections = module === 'x-sections';
  const isProcessing = module === 'processing';
  const useZoomLayer = isXSections || isProcessing;

  if (seeAll === false && module === 'x-sections') {
    zoomLayer.selectAll(`.${sectionClass}`).remove();
    uiLayer.selectAll(`.${sectionClass}`).remove();
    return;
  }

  if (seeAll === false && !isActive && module === 'results') {
    zoomLayer.selectAll(`.${sectionClass}`).remove();
    uiLayer.selectAll(`.${sectionClass}`).remove();
    return;
  }

  // Clean only this section to avoid duplicates
  zoomLayer.selectAll(`.${sectionClass}`).remove();
  uiLayer.selectAll(`.${sectionClass}`).remove();

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
        resizeFactor,
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
        resizeFactor,
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
      text: name,
      points: [sectionPoints[0], sectionPoints[1]],
      viewport: { imageWidth, imageHeight, position, scale },
      factor,
      resizeFactor,
      color: textColor,
      className: `static-section-label ${sectionClass}`,
    });
  }

  // Icons in UI (screen space) — only when not deferring to interactive layer
  if (!skipLine && module === 'x-sections' && hasMeaningfulDirPoints) {
    const toScreen = toScreenFactory({ imageWidth, imageHeight, position, scale, fx, fy });
    const p0 = toScreen(dirPoints[0]);
    const p1 = toScreen(dirPoints[1]);

    drawIcon(p0, 'L', uiLayer, false, sectionClass, module);
    drawIcon(p1, 'R', uiLayer, false, sectionClass, module);
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
}

const drawInteractiveSection = ({
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
}: DrawSvgInteractiveSectionProps) => {
  const { resizeFactor, lineColor } = getSectionStyles(module);

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
      resizeFactor,
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
      resizeFactor,
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

  // Drag para startPoint: usa subject + container(zoomLayerNode) para mantener el offset
  const dragStartPoint = d3
    .drag<SVGImageElement, unknown, { x: number; y: number }>()
    .container(() => zoomLayerNode) // coordenadas del puntero en zoom-space
    .on('start', () => setMousePressed(true))
    .on('drag', function (event) {
      const x = event.x;
      const y = event.y;

      // Actualiza el modelo en zoom-space
      setStartPoint({ x, y });

      // Mueve el ícono en screen-space inmediatamente
      const pScreen = toScreenFromZoom({ x, y });
      d3.select<SVGImageElement, unknown>(this)
        .attr('x', pScreen.x - MARKS.OFFSET_X)
        .attr('y', pScreen.y - MARKS.OFFSET_Y);
    })
    .on('end', function (event) {
      setMousePressed(false);
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
  const dragEndPoint = d3
    .drag<SVGImageElement, unknown, { x: number; y: number }>()
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
      d3.select<SVGImageElement, unknown>(this)
        .attr('x', pScreen.x - MARKS.OFFSET_X)
        .attr('y', pScreen.y - MARKS.OFFSET_Y);
    })
    .on('end', function (event) {
      setMousePressed(false);
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
    const c1 = drawIcon(pScreen, 'L', uiLayer, true, `${sectionClass} ${interactiveUiClass}`, module);
    c1.call(dragStartPoint as any);
  }

  if (endPoint) {
    const pScreen = toScreenFromZoom(endPoint);
    const c2 = drawIcon(pScreen, 'R', uiLayer, true, `${sectionClass} ${interactiveUiClass}`, module);
    c2.call(dragEndPoint as any);
  }
};

export { drawStaticSection, drawInteractiveSection };
