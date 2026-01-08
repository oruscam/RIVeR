import { useEffect, useMemo, useRef } from 'react';
import './graphs.css';
import { useProjectSlice, useSectionSlice, useUiSlice } from '../../hooks';
import * as d3 from 'd3';
import { drawVectors } from './index';
import { Section } from '../../store/section/types';
import { getGlobalMagnitudes } from '../../helpers/drawVectorsFunctions';
import { drawStaticSection } from '../CrossSections/drawSections';

interface VelocityVectorProps {
  height: number;
  width: number;
  factor: number | { x: number; y: number };
  isReport?: boolean;
  seeAll: boolean;
  sectionIndex?: number;
}

export const VelocityVector = ({
  height,
  width,
  factor,
  isReport = false,
  seeAll,
  sectionIndex,
}: VelocityVectorProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { video } = useProjectSlice();
  const { sections, activeSection, transformationMatrix } = useSectionSlice();
  const { screenSizes } = useUiSlice();

  const { width: imageWidth, height: imageHeight } = video.data;

  const { max: globalMax, min: globalMin } = useMemo(() => {
    return getGlobalMagnitudes(sections);
  }, [sections]);

  useEffect(() => {
    d3.select(svgRef.current).selectAll('*').remove();
    const svg = d3.select(svgRef.current as SVGSVGElement);
    svg.attr('width', width).attr('height', height).style('background-color', 'transparent');

    sections.forEach((section: Section, index: number) => {
      const { data, interpolated, name, sectionPoints, dirPoints } = section;
      if (!data) return;

      if (seeAll) {
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
        drawStaticSection({
          svgElement: svgRef.current!,
          factor: factor,
          dirPoints: dirPoints,
          sectionPoints: sectionPoints,
          name: name,
          imageWidth: screenSizes.imageWidth!,
          imageHeight: screenSizes.imageHeight!,
          module: isReport ? 'report' : 'results',
        });
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
          drawStaticSection({
            svgElement: svgRef.current!,
            factor: factor,
            dirPoints: dirPoints,
            sectionPoints: sectionPoints,
            name: name,
            imageWidth: screenSizes.imageWidth!,
            imageHeight: screenSizes.imageHeight!,
            module: isReport ? 'report' : 'results',
          });
        }
      }
    });
  }, [factor, seeAll, sections, activeSection]);

  return (
    <svg ref={svgRef} className="svg-in-image-container" />
  );
};
