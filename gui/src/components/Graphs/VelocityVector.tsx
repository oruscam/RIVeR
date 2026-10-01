import { useEffect, useMemo, useRef, useState } from 'react';
import './graphs.css';
import { useProjectSlice, useSectionSlice, useUiSlice, useVelocityColorRange } from '../../hooks';
import * as d3 from 'd3';
import { drawVectors } from './index';
import { Section } from '../../store/section/types';
import { getEffectiveTechniqueData } from '../../helpers';
import { OverlayLayers } from '../OverlaySvg';
import { DEFAULT_PERIOD_S } from '../../helpers/chevronGlyph';
import { prefersReducedMotion } from '../../helpers/motion';

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
  const { video } = useProjectSlice();
  const { sections, activeSection, transformationMatrix } = useSectionSlice();

  const { seeAll, hoveredStation, onSetHoveredStation, onPinStation } = useUiSlice();

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
          step: video.parameters.step,
          fps: video.data.fps,
        });
        return effective ? effective.resolved : null;
      }),
    [sections, video]
  );

  // Same shared computation the colour bar reads (`ImageResults`), so the
  // bar and the chevrons can never disagree on what a colour means — a
  // locked colour-bar range wins in both.
  const { min: globalMin, max: globalMax } = useVelocityColorRange();

  const animated = !isReport && !prefersReducedMotion();

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
          index === activeSection ? hoveredStation : null,
          onSetHoveredStation,
          onPinStation
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
            onSetHoveredStation,
            onPinStation
          );
        }
      }
    });
    // onSetHoveredStation/onPinStation are recreated every render by useUiSlice but only ever
    // change together with the state they close over (already tracked); adding them directly
    // would redraw this chart on every unrelated re-render
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    phase,
    animated,
    hoveredStation,
  ]);
  return null;
};
