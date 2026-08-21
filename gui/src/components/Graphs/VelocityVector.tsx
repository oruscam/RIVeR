import { useEffect, useMemo, useRef, useState } from 'react';
import './graphs.css';
import { useProjectSlice, useSectionSlice, useUiSlice, useVelocityColorRange } from '../../hooks';
import * as d3 from 'd3';
import { drawVectors } from './index';
import { Section } from '../../store/section/types';
import { getEffectiveTechniqueData } from '../../helpers';
import { OverlayLayers } from '../OverlaySvg';
import { DEFAULT_PERIOD_S } from '../../helpers/chevronGlyph';

interface VelocityVectorProps {
  height: number;
  width: number;
  factor: number | { x: number; y: number };
  isReport?: boolean;
  sectionIndex?: number;
  layers: OverlayLayers;
}

export const VelocityVector = ({
  height,
  width,
  factor,
  isReport = false,
  sectionIndex,
  layers,
}: VelocityVectorProps) => {
  const { interactiveLayerRef } = layers;
  const { video, projectDetails } = useProjectSlice();
  const { sections, activeSection, transformationMatrix } = useSectionSlice();

  const { seeAll } = useUiSlice();

  const { width: imageWidth, height: imageHeight } = video.data;

  // The same live resolution the velocity chart uses (active technique +
  // interpolate + artificial seeding + per-station checks), so the arrows over
  // the image always show what the chart plots. One entry per section, index-aligned
  // with `sections`; null where a section has no data or never ran that technique.
  const resolvedPerSection = useMemo(
    () =>
      sections.map((section: Section) => {
        if (!section.data) return null;
        const effective = getEffectiveTechniqueData(section.data, section.activeTechnique, {
          interpolated: section.interpolated,
          artificialSeeding: section.artificialSeeding,
          alpha: section.alpha,
        });
        return effective ? effective.resolved : null;
      }),
    [sections]
  );

  // Same shared computation the colour bar reads (`ImageResults`), so the
  // bar and the chevrons can never disagree on what a colour means — a
  // locked colour-bar range wins in both.
  const { min: globalMin, max: globalMax } = useVelocityColorRange();

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const animated = !isReport && !prefersReducedMotion;

  const [phase, setPhase] = useState(0);
  const rafRef = useRef(0);
  useEffect(() => {
    if (!animated) return;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setPhase((p) => (p + dt / DEFAULT_PERIOD_S) % 1);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [animated]);

  // Hover lives here, not as a DOM mutation inside drawVectors: the draw
  // effect below tears down and rebuilds every polygon on each animation
  // frame, so any opacity change written directly onto a polygon is gone by
  // the next frame. Keeping it as state means the next draw (triggered by
  // this very state change, see the dependency array below) renders the
  // hovered station's chevrons at full opacity instead.
  // (Unrelated to the `hoveredStation` in the ui slice used for chart/grid
  // sync — this one is local to the image overlay.)
  const [hoveredStation, setHoveredStation] = useState<number | null>(null);

  // Defensive recovery for a stuck tooltip: if hover ever ends without the
  // hit area's mouseout firing (e.g. its element was destroyed by a redraw
  // while the pointer sat on it), this still hides the tooltip as soon as
  // `hoveredStation` is cleared.
  useEffect(() => {
    if (hoveredStation === null) {
      d3.select<HTMLDivElement, unknown>('#vectors-tooltip').style('opacity', 0);
    }
  }, [hoveredStation]);

  // A tooltip must never survive a genuine context change (switching the
  // active/report section, toggling seeAll) even if the hit area that opened
  // it is long gone. This deliberately does NOT depend on `phase`: the draw
  // effect below re-runs on every animation frame, and hiding the tooltip
  // there raced the mouseover fade-in transition — the tooltip could only
  // ever flash for ~200ms after arrival and then go dark, since nothing
  // repaints it once the transition finishes and the next frame's cleanup
  // (~16ms later) zeroes it again. Keying on the actual context instead of
  // the render clock keeps that recovery without breaking "stays visible
  // while hovering".
  useEffect(() => {
    d3.select<HTMLDivElement, unknown>('#vectors-tooltip').style('opacity', 0);
  }, [activeSection, seeAll, sectionIndex]);

  // Unmount-only hide, so the tooltip node appended to <body> can never
  // outlive this component.
  useEffect(() => {
    return () => {
      d3.select<HTMLDivElement, unknown>('#vectors-tooltip').style('opacity', 0);
    };
  }, []);

  useEffect(() => {
    d3.select(interactiveLayerRef.current).selectAll('*').remove();
    const svg = d3.select(interactiveLayerRef.current as SVGSVGElement);
    svg.attr('width', width).attr('height', height).style('background-color', 'transparent');

    // One filter definition, applied per station group — 15 filter passes a
    // frame instead of one per chevron.
    const defs = svg.append('defs');
    defs
      .append('filter')
      .attr('id', 'chevron-soft-shadow')
      .attr('x', '-60%')
      .attr('y', '-60%')
      .attr('width', '220%')
      .attr('height', '220%')
      .append('feDropShadow')
      .attr('dx', 0)
      .attr('dy', 1)
      .attr('stdDeviation', 1.4)
      .attr('flood-color', '#000')
      .attr('flood-opacity', 0.45);

    sections.forEach((section: Section, index: number) => {
      const { data, interpolated } = section;
      if (!data) return;

      const magnitude = resolvedPerSection[index];
      if (!magnitude) return;

      if (seeAll && isReport === false) {
        drawVectors(
          svg,
          factor,
          activeSection,
          interpolated,
          data,
          magnitude,
          isReport,
          transformationMatrix,
          imageWidth,
          imageHeight,
          globalMin,
          globalMax,
          phase,
          animated,
          hoveredStation,
          setHoveredStation,
          projectDetails.unitSistem
        );
      } else {
        if (isReport && sectionIndex !== index) return;
        if (activeSection === index || isReport) {
          drawVectors(
            svg,
            factor,
            activeSection,
            interpolated,
            data,
            magnitude,
            isReport,
            transformationMatrix,
            imageWidth,
            imageHeight,
            globalMin,
            globalMax,
            phase,
            animated,
            hoveredStation,
            setHoveredStation,
            projectDetails.unitSistem
          );
        }
      }
    });
  }, [
    factor,
    seeAll,
    sections,
    activeSection,
    height,
    width,
    isReport,
    sectionIndex,
    interactiveLayerRef,
    transformationMatrix,
    imageWidth,
    imageHeight,
    globalMin,
    globalMax,
    resolvedPerSection,
    projectDetails.unitSistem,
    phase,
    animated,
    hoveredStation,
  ]);
  return null;
};
