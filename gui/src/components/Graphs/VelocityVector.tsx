import { useEffect, useMemo, useRef } from 'react';
import './graphs.css';
import { useProjectSlice, useSectionSlice, useUiSlice } from '../../hooks';
import * as d3 from 'd3';
import { drawVectors } from './index';
import { Section } from '../../store/section/types';
import { getGlobalMagnitudes } from '../../helpers/drawVectorsFunctions';
import { OverlayLayers } from '../OverlaySvg';

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
  layers
}: VelocityVectorProps) => {
  const { interactiveLayerRef } = layers;
  const { video } = useProjectSlice();
  const { sections, activeSection, transformationMatrix } = useSectionSlice();

  const { seeAll } = useUiSlice();

  const { width: imageWidth, height: imageHeight } = video.data;

  const { max: globalMax, min: globalMin } = useMemo(() => {
    return getGlobalMagnitudes(sections);
  }, [sections]);

  useEffect(() => {
    d3.select(interactiveLayerRef.current).selectAll('*').remove();
    const svg = d3.select(interactiveLayerRef.current as SVGSVGElement);
    svg.attr('width', width).attr('height', height).style('background-color', 'transparent');

    sections.forEach((section: Section, index: number) => {
      const { data, interpolated } = section;
      if (!data) return;

      if (seeAll && isReport === false) {
        drawVectors(
          svg,
          factor,
          activeSection,
          interpolated,
          data,
          isReport,
          transformationMatrix,
          imageWidth,
          imageHeight,
          globalMin,
          globalMax
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
            isReport,
            transformationMatrix,
            imageWidth,
            imageHeight,
            globalMin,
            globalMax
          );
        }
      }
    });
  }, [factor, seeAll, sections, activeSection]);
  return null;
};
